---
name: financial-statement-analysis-assistant
description: Analyse financial statements (income statement, balance sheet, cash flow statement), calculate key ratios, compare periods and explain the results in clear, neutral language. Use this skill whenever the user provides company financial figures, asks for ratio analysis, year-on-year comparison, profitability, liquidity, solvency or cash flow review, or wants a summary of a company's financial position, even if they do not use the words "financial statement analysis".
---

# Financial Statement Analysis

This skill turns financial statement figures into a clear, accurate and professional analysis that a finance manager can act on.

## Inputs

The user may provide, for one or two periods:
- Income statement: revenue, operating expenses, operating profit, profit before tax, tax expense, net profit
- Balance sheet: current assets, total assets, current liabilities, total liabilities, shareholders' equity, total debt, cash and cash equivalents
- Cash flow statement: operating, investing and financing cash flows

Use the currency and unit the user states (Rs, Rs thousands, Rs lakhs, Rs crore, Rs millions). If none is stated, use Indian rupees (Rs). Keep the unit consistent and say which unit is used.

## Formulas (use exactly these)

| Measure | Formula |
|---|---|
| Percentage change | (Current - Previous) / Previous x 100 |
| Revenue growth % | (Current revenue - Previous revenue) / Previous revenue x 100 |
| Net profit growth % | (Current net profit - Previous net profit) / Previous net profit x 100 |
| Operating profit margin | Operating profit / Revenue x 100 |
| Net profit margin | Net profit / Revenue x 100 |
| Current ratio | Current assets / Current liabilities |
| Debt-to-equity ratio | Total debt / Shareholders' equity |
| Return on equity (ROE) | Net profit / Shareholders' equity x 100 |
| Net change in cash | Operating + Investing + Financing cash flow |

Rules for calculation:
- Calculate a ratio only when every figure it needs is provided.
- If a denominator is zero, say the result is not defined. Never divide by zero.
- If a previous value is zero or negative, a percentage change is not meaningful; say so.
- If shareholders' equity is zero or negative, debt-to-equity and ROE are not meaningful; say so.
- When figures or ratios are supplied already calculated (for example by an application), use them exactly as given. Never recalculate, round differently, or change a number.

## Data checks

If the input includes check results (for example, total assets not equal to total liabilities plus equity), report each mismatch first and state that the analysis depends on figures that need verifying. Do not try to fix the numbers.

## Interpretation rules

- Separate financial facts (what the numbers are) from observations (what they may indicate).
- Do not call an increase good or a decrease bad automatically. Consider the context.
- Do not state a cause as fact. The numbers show what changed, not why. Offer possible factors only as items to investigate.
  - Do not say: "Profit fell because of higher raw material costs."
  - Say instead: "Profit fell. Raw material costs could be one factor to investigate if that information is available."
- Do not treat positive or negative cash flow as automatically good or bad. Describe whether each activity generated or used cash.
- Do not give investment, tax or legal advice, and do not predict future performance.
- Use neutral, professional language.

## Output format

When asked for a full analysis, use these sections in order:
1. Financial Performance Summary
2. Income Statement Analysis
3. Balance Sheet Analysis
4. Cash Flow Analysis
5. Ratio Analysis (show formula, calculation and result for each ratio)
6. Key Trends and Changes
7. Key Financial Insights
8. Areas to Review

Use tables for numerical comparisons.

### Application mode

When the application supplies the figures, tables and ratios already calculated and displayed, write only these sections, in plain text with no markdown symbols and under 300 words in total:
1. Financial Performance Summary (2 to 3 sentences)
2. Key Trends and Changes (up to 4 short lines, each starting with a hyphen)
3. Key Financial Insights (up to 3 short lines, each starting with a hyphen)
4. Areas to Review (up to 4 short lines, each starting with a hyphen, phrased as things to verify or investigate)

Put each section title on its own line.

## Accuracy rules

- Use only the figures provided. Do not invent, assume or adjust any figure.
- If information is missing, name exactly what is missing and which ratio it prevents.
- Mention the unit once, near the start.
- Do not describe a ratio as healthy or unhealthy without context. Industries differ, so say that a benchmark or peer comparison is needed.

## Worked example

Input (Rs): Revenue previous 10,00,000, current 12,00,000. Net profit previous 1,50,000, current 1,80,000. Current assets 6,00,000, current liabilities 3,00,000, equity 5,00,000, debt 2,00,000.

Expected results:
- Revenue growth = (12,00,000 - 10,00,000) / 10,00,000 x 100 = 20%
- Net profit growth = (1,80,000 - 1,50,000) / 1,50,000 x 100 = 20%
- Net profit margin (current) = 1,80,000 / 12,00,000 x 100 = 15%
- Current ratio = 6,00,000 / 3,00,000 = 2.00
- Debt-to-equity = 2,00,000 / 5,00,000 = 0.40
- ROE = 1,80,000 / 5,00,000 x 100 = 36%

The analysis should say revenue and net profit both increased by 20% and that net profit margin was 15% in both years. It should present the current ratio and debt-to-equity as indicators of liquidity and capital structure, and note that a peer benchmark is needed to judge them.

## Self-check before answering

- Does every number come from the input or a shown calculation?
- Were any missing figures assumed? (They must not be.)
- Were ratios skipped where data was missing or a denominator was zero?
- Are facts separated from interpretation, and are causes only suggested for investigation?
- Is the unit stated and consistent?
- Is the output within the required length and format?
