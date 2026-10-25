"""Train CFPB financial-product classifiers and export a browser-ready model.

Run from the project folder: python scripts/train.py
This script expects the July 2026 archive from scripts/download_data.py.
"""
import argparse
import collections
import csv
from datetime import date
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import zipfile

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs'
SOURCE_URL = 'https://files.consumerfinance.gov/f/documents/CCDB_Export_20_July_2026.zip'
ARCHIVE_URL = 'https://www.consumerfinance.gov/foia-requests/foia-electronic-reading-room/cfpb-consumer-complaint-database-narratives-archive/'
SEED = 42


def clean(text):
    # Remove CFPB redaction placeholders, such as XXXX, then lowercase.
    return re.sub(r'\b[xX]{2,}\b', ' ', text).lower()


def read_data(source):
    rows, seen = [], set()
    duplicate_count = empty_count = 0
    with zipfile.ZipFile(source) as archive:
        csv_name = next(name for name in archive.namelist() if name.endswith('.csv'))
        with archive.open(csv_name) as binary:
            reader = csv.DictReader(io.TextIOWrapper(binary, encoding='utf-8-sig'))
            for row in reader:
                text = clean(row['Consumer complaint narrative'])
                normalized = ' '.join(re.findall(r'[a-z]{2,}', text))
                if len(normalized) < 30:
                    empty_count += 1
                    continue
                # Deduplicate BEFORE splitting to avoid exact duplicate leakage.
                if normalized in seen:
                    duplicate_count += 1
                    continue
                seen.add(normalized)
                rows.append((text, row['Product'], row['Complaint ID']))
    return rows, duplicate_count, empty_count


def score_predictions(y_true, predictions, labels):
    return {
        'accuracy': accuracy_score(y_true, predictions),
        'macro_f1': f1_score(y_true, predictions, average='macro'),
        'report': classification_report(
            y_true, predictions, labels=labels, output_dict=True, zero_division=0
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', nargs='?', type=Path, default=ROOT / 'data' / 'cfpb-july-2026.zip')
    args = parser.parse_args()
    if not args.archive.exists():
        parser.error('Download the archive first: python scripts/download_data.py')
    source_hash = hashlib.sha256(args.archive.read_bytes()).hexdigest()
    previous = json.loads((OUT / 'metrics.json').read_text())
    if source_hash != previous['source_sha256']:
        parser.error('Expected the same July 2026 archive as the bundled model. The checksum differs.')

    print('Reading and deduplicating narratives. This can take a moment...', flush=True)
    rows, duplicates, empty = read_data(args.archive)
    texts = [row[0] for row in rows]
    y = np.array([row[1] for row in rows])
    indices = np.arange(len(rows))
    # 70% training / 15% validation / 15% test. Preserve class proportions.
    train, remaining = train_test_split(indices, test_size=.30, random_state=SEED, stratify=y)
    validation, test = train_test_split(remaining, test_size=.50, random_state=SEED, stratify=y[remaining])
    text_at = lambda subset: [texts[i] for i in subset]

    candidates = []
    experiments = [
        ('Unigram SVM', (1, 1), None),
        ('Bigram SVM', (1, 2), None),
        ('Balanced bigram SVM', (1, 2), 'balanced'),
    ]
    for name, ngrams, weights in experiments:
        print(f'Training {name}...', flush=True)
        vectorizer = TfidfVectorizer(
            ngram_range=ngrams,
            max_features=24000,
            min_df=2,
            sublinear_tf=True,
            token_pattern=r'(?u)\b[a-z]{2,}\b',
        )
        # Vocabulary and IDF are learned from training text ONLY.
        x_train = vectorizer.fit_transform(text_at(train))
        classifier = LinearSVC(
            C=1, class_weight=weights, random_state=SEED, dual='auto', max_iter=5000
        )
        classifier.fit(x_train, y[train])
        predicted = classifier.predict(vectorizer.transform(text_at(validation)))
        validation_f1 = f1_score(y[validation], predicted, average='macro')
        candidates.append((name, vectorizer, classifier, validation_f1))
        print(f'{name}: validation macro-F1 = {validation_f1:.4f}', flush=True)

    # Select BEFORE looking at test results. Do not tune using test scores.
    name, vectorizer, classifier, _ = max(candidates, key=lambda c: c[3])
    labels = classifier.classes_.tolist()
    reports = []
    for candidate_name, vec, clf, validation_f1 in candidates:
        predicted = clf.predict(vec.transform(text_at(test)))
        reports.append({
            'name': candidate_name,
            'validation_macro_f1': validation_f1,
            **score_predictions(y[test], predicted, labels),
        })
    dummy = DummyClassifier(strategy='most_frequent')
    dummy.fit(np.zeros((len(train), 1)), y[train])
    predicted = dummy.predict(np.zeros((len(test), 1)))
    reports.insert(0, {'name': 'Majority class', **score_predictions(y[test], predicted, labels)})
    test_predictions = classifier.predict(vectorizer.transform(text_at(test)))

    metrics = {
        'selected': name, 'source_url': SOURCE_URL, 'archive_url': ARCHIVE_URL,
        'source_sha256': source_hash, 'trained_at': date.today().isoformat(),
        'data_period': 'July 2026', 'total': len(rows), 'train': len(train),
        'validation': len(validation), 'test': len(test),
        'duplicates_removed': duplicates, 'empty_or_short_removed': empty,
        'features': len(vectorizer.vocabulary_), 'labels': labels,
        'counts': dict(collections.Counter(y)), 'baselines': reports,
        'confusion': confusion_matrix(y[test], test_predictions, labels=labels).tolist(),
        'split': 'Stratified 70/15/15; random_state=42; exact normalized narrative deduplication before splitting. Vectorizer fit on training data only. Baseline chosen by validation macro-F1. No refit on test data.',
        'limitations': [
            'CFPB financial-product categories only; not a general-business classifier.',
            'Random split is not a prospective or temporal evaluation; near-duplicate templates may inflate performance.',
            'Public, consented narratives are a selected sample. Product recall does not measure demographic fairness.',
            'Decision margins are not probabilities. Review thresholds are conservative heuristics, not calibrated guarantees.',
            'Product labels reflect consumer selections; complaints are unverified allegations.',
        ],
    }
    # JSON carries the numerical model into the browser; Python is not needed online.
    model = {
        'classes': labels,
        'vocabulary': {term: int(index) for term, index in vectorizer.vocabulary_.items()},
        'idf': vectorizer.idf_.round(9).tolist(),
        'weights': classifier.coef_.round(9).tolist(),
        'intercept': classifier.intercept_.round(9).tolist(),
        'ngram_max': vectorizer.ngram_range[1], 'name': name,
    }
    (OUT / 'model.json').write_text(json.dumps(model, separators=(',', ':')), encoding='utf-8')
    (OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')

    examples = [
        'My mortgage servicer has failed to apply my payment and my escrow balance is incorrect.',
        'My credit report lists an account that does not belong to me. I disputed it with the bureau.',
        'The debt collector keeps calling about a debt I already paid.',
        'My checking account has been frozen and I cannot withdraw my paycheck.',
        'My student loan repayment plan was denied and the servicer will not help.',
        'The credit card company charged a late fee after I paid my bill.',
    ]
    parity = [
        {'text': text, 'scores': classifier.decision_function(vectorizer.transform([clean(text)]))[0].tolist()}
        for text in examples
    ]
    (OUT / 'parity.json').write_text(json.dumps(parity), encoding='utf-8')
    split_ids = {name: [rows[i][2] for i in subset] for name, subset in [('train', train), ('validation', validation), ('test', test)]}
    (ROOT / 'scripts' / 'split_ids.json').write_text(json.dumps(split_ids), encoding='utf-8')
    shutil.copyfile(__file__, OUT / 'train.py')
    selected = next(report for report in reports if report['name'] == name)
    print(f'Selected: {name}; test accuracy: {selected["accuracy"]:.4f}; test macro-F1: {selected["macro_f1"]:.4f}')
    print('Updated docs/model.json and docs/metrics.json. Restart or refresh your local preview.')


if __name__ == '__main__':
    main()
