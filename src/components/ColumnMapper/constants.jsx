export const GLOBAL_RULES = [
  { value: "date_standardize", label: "Date Columns → Standardize (ISO 8601)", pattern: /date|time|timestamp|created|updated/i },
  { value: "text_trim", label: "Text Columns → Trim Whitespace", pattern: /varchar|text|char|string|name|description|title/i },
  { value: "number_remove_leading", label: "Number Columns → Remove Leading Zeros", pattern: /int|decimal|numeric|number|float/i },
  { value: "phone_format", label: "Phone Columns → Format", pattern: /phone|telephone|mobile/i },
  { value: "email_lower", label: "Email Columns → Lowercase", pattern: /email|mail/i },
];

export const DQ_RULES = [
  { value: "not_null", label: "Not Null" },
  { value: "unique", label: "Unique" },
  { value: "range_check", label: "Range Check" },
  { value: "pattern_match", label: "Pattern Match" },
  { value: "length_check", label: "Length Check" },
];

export const ENCRYPTION_TYPES = [
  { value: "aes256", label: "AES-256" },
  { value: "hash_sha256", label: "Hash (SHA-256)" },
  { value: "tokenize", label: "Tokenize" },
];

export const TRANSFORMATIONS = [
  { value: "direct",          label: "Direct Copy" },
  { value: "uppercase",       label: "UPPERCASE" },
  { value: "lowercase",       label: "lowercase" },
  { value: "trim",            label: "Trim Whitespace" },
  { value: "date_iso",        label: "Date → ISO 8601" },
  { value: "date_epoch",      label: "Date → Epoch (ms)" },
  { value: "round_2dp",       label: "Number → Round 2dp" },
  { value: "round_0dp",       label: "Number → Round Integer" },
  { value: "bool_yn",         label: "Boolean → Y/N" },
  { value: "bool_10",         label: "Boolean → 1/0" },
  { value: "null_empty",      label: "NULL → Empty String" },
  { value: "null_zero",       label: "NULL → 0" },
  { value: "hash_md5",        label: "Hash (MD5)" },
  { value: "hash_sha256",     label: "Hash (SHA-256)" },
  { value: "mask_partial",    label: "Mask (Partial)" },
  { value: "mask_full",       label: "Mask (Full)" },
  { value: "custom_sql",      label: "Custom SQL Expression" },
];

export const PAGE_SIZE = 50;
export const MAPPING_PAGE_SIZE = 50;

export const DATA_TYPES = ["varchar(255)", "int", "datetime", "decimal(18,2)", "bit", "bigint", "nvarchar(max)"];