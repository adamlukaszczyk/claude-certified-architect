# Coding Standards

## Function naming
- Use verb_noun format: get_product, update_stock, calculate_total
- Prefix validation functions with validate_
- Prefix formatting functions with format_

## Error handling
- Return None for not-found cases, never raise exceptions in lookup functions
- Validate inputs at the start of each public function
- Use descriptive variable names for error states

## Data formats
- Product IDs use "PROD-XXX" format
- Prices are floats rounded to 2 decimal places
- Stock quantities are non-negative integers

## Other
- **No inline return structures** — assign to a variable first, then return it.
- **No function calls as arguments** — assign the result first, then pass it.
- **Constants in `config.py`** — model name, console colors.
- **File headers** — every Python file starts with `# filename.py - Short description`.
- Functions over classes.
- Comments only where they clarify an exam concept.
- `.env` for API keys — never hardcoded.