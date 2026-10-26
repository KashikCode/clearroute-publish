# Model card

Clearroute is an English-language financial-product classification baseline. It suggests a product category and an editable team destination. It does not resolve complaints, email teams, or create external tickets.

## Data and evaluation

- CFPB July 2026 narrative archive; exact URL and SHA-256 in the evaluation JSON.
- 9,307 distinct usable narratives, after removal of very short/empty text and 690 normalized duplicates.
- Train 6,514 / validation 1,396 / test 1,397; stratified, random seed 42.
- Word TF-IDF, up to 24,000 features, min_df=2, sublinear TF, L2 normalization.
- Unigram, unigram–bigram, and class-balanced unigram–bigram LinearSVC baselines; C=1.
- Select by validation macro-F1 before reviewing test performance. Included model is balanced bigram SVM.
- Test accuracy 0.80816; macro-F1 0.72238. Per-class results and support are in metrics.json.
- Browser inference is checked against Python decision scores on authored examples. This is implementation verification, not a substitute for model evaluation.

## Intended use and limitations

Research, learning, and human-reviewed financial complaint triage. Not validated for general retail, restaurants, healthcare, or arbitrary business categories. Consumer-selected labels and narratives are not verified findings. Published narratives are a selected sample. A random split can overestimate future performance; near-duplicate templates can remain.

Debt/credit-management recall is 15.4%, and prepaid-card recall is 40.0% on the included test set. Small per-class sample sizes increase uncertainty. Macro-F1 does not establish demographic fairness. Recall warnings use the predicted class and cannot catch all false negatives from weak categories.

SVM margins are not probabilities. Short-input, margin-gap, vocabulary-coverage, and per-class recall thresholds are adjustable heuristics. Corrections do not retrain the model. Any future retraining on new data must revisit source metadata, split design, labels, calibration, and inference parity. Do not tune repeatedly against the same test set.

## Privacy and workflow

Complaint text is processed in the browser. Queue and settings live in sessionStorage, with CSV export. There is no shared durable backend. Generated public assets contain model coefficients and aggregate evaluation, not training narratives. Raw archives and environments are excluded from Git.
