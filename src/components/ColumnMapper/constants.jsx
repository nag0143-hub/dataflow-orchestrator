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

// category: "core" | "spark_native" | "spark_udf" | "custom"
export const TRANSFORMATIONS = [
  // ── Direct Copy ──
  { value: "direct",            label: "Direct Copy",                    category: "core" },

  // ── Spark Native ──
  { value: "uppercase",         label: "upper(col)",                     category: "spark_native" },
  { value: "lowercase",         label: "lower(col)",                     category: "spark_native" },
  { value: "trim",              label: "trim(col)",                      category: "spark_native" },
  { value: "ltrim",             label: "ltrim(col)",                     category: "spark_native" },
  { value: "rtrim",             label: "rtrim(col)",                     category: "spark_native" },
  { value: "length",            label: "length(col)",                    category: "spark_native" },
  { value: "coalesce_empty",    label: "coalesce(col, '')",              category: "spark_native" },
  { value: "coalesce_zero",     label: "coalesce(col, 0)",               category: "spark_native" },
  { value: "cast_string",       label: "cast(col as string)",            category: "spark_native" },
  { value: "cast_int",          label: "cast(col as int)",               category: "spark_native" },
  { value: "cast_long",         label: "cast(col as bigint)",            category: "spark_native" },
  { value: "cast_double",       label: "cast(col as double)",            category: "spark_native" },
  { value: "cast_decimal",      label: "cast(col as decimal(18,2))",     category: "spark_native" },
  { value: "cast_date",         label: "cast(col as date)",              category: "spark_native" },
  { value: "cast_timestamp",    label: "cast(col as timestamp)",         category: "spark_native" },
  { value: "date_iso",          label: "to_date(col, 'yyyy-MM-dd')",     category: "spark_native" },
  { value: "date_epoch",        label: "unix_timestamp(col)",            category: "spark_native" },
  { value: "date_format",       label: "date_format(col, <fmt>)",        category: "spark_native" },
  { value: "current_timestamp", label: "current_timestamp()",            category: "spark_native" },
  { value: "current_date",      label: "current_date()",                 category: "spark_native" },
  { value: "year",              label: "year(col)",                      category: "spark_native" },
  { value: "month",             label: "month(col)",                     category: "spark_native" },
  { value: "dayofmonth",        label: "dayofmonth(col)",                category: "spark_native" },
  { value: "round_2dp",         label: "round(col, 2)",                  category: "spark_native" },
  { value: "round_0dp",         label: "round(col, 0)",                  category: "spark_native" },
  { value: "abs",               label: "abs(col)",                       category: "spark_native" },
  { value: "ceil",              label: "ceil(col)",                      category: "spark_native" },
  { value: "floor",             label: "floor(col)",                     category: "spark_native" },
  { value: "bool_yn",           label: "if(col, 'Y', 'N')",             category: "spark_native" },
  { value: "bool_10",           label: "if(col, 1, 0)",                  category: "spark_native" },
  { value: "null_empty",        label: "nvl(col, '')",                   category: "spark_native" },
  { value: "null_zero",         label: "nvl(col, 0)",                    category: "spark_native" },
  { value: "concat",            label: "concat(col, ...)",               category: "spark_native" },
  { value: "string_concat",     label: "concat(<prefix>, col, <suffix>)", category: "spark_native" },
  { value: "substring",         label: "substring(col, pos, len)",       category: "spark_native" },
  { value: "replace",           label: "replace(col, find, replace)",    category: "spark_native" },
  { value: "regex_replace",     label: "regexp_replace(col, pat, repl)", category: "spark_native" },
  { value: "regex_extract",     label: "regexp_extract(col, pat, idx)",  category: "spark_native" },
  { value: "split_col",         label: "split(col, delim)",              category: "spark_native" },
  { value: "hash_md5",          label: "md5(col)",                       category: "spark_native" },
  { value: "hash_sha256",       label: "sha2(col, 256)",                 category: "spark_native" },
  { value: "hash_sha512",       label: "sha2(col, 512)",                 category: "spark_native" },
  { value: "base64_encode",     label: "base64(col)",                    category: "spark_native" },
  { value: "base64_decode",     label: "unbase64(col)",                  category: "spark_native" },
  { value: "mask_partial",      label: "mask(col) – partial",            category: "spark_native" },
  { value: "mask_full",         label: "mask(col) – full",               category: "spark_native" },
  { value: "custom_sql",        label: "Custom SQL Expression",          category: "spark_native" },

  // ── Spark UDF (built-in examples – users add more via Custom Functions table) ──
  { value: "udf_standardize_phone", label: "udf_standardize_phone(col)", category: "spark_udf" },
  { value: "udf_mask_pii",          label: "udf_mask_pii(col)",          category: "spark_udf" },
  { value: "udf_currency_convert",  label: "udf_currency_convert(col)",  category: "spark_udf" },
];

// Which transformations require extra param inputs
export const TRANSFORMATION_PARAMS = {
  date_format:   { fields: [{ key: "format_string", label: "Format", placeholder: "YYYY-MM-DD" }] },
  string_concat: { fields: [{ key: "concat_prefix", label: "Prefix", placeholder: "prefix_" }, { key: "concat_suffix", label: "Suffix", placeholder: "_suffix" }] },
  regex_replace: { fields: [{ key: "regex_pattern", label: "Pattern", placeholder: "\\d+" }, { key: "regex_replacement", label: "Replace with", placeholder: "" }] },
  custom_sql:    { fields: [{ key: "expression", label: "SQL Expression", placeholder: "CAST({col} AS VARCHAR)" }] },
};

export const COLUMN_DQ_RULES = [
  { value: "not_null",      label: "Not Null",      hasParam: false },
  { value: "unique",        label: "Unique",         hasParam: false },
  { value: "range_check",   label: "Range Check",    hasParam: true, paramLabel: "Min,Max", placeholder: "0,100" },
  { value: "pattern_match", label: "Pattern Match",  hasParam: true, paramLabel: "Regex",   placeholder: "^[A-Z]" },
  { value: "length_check",  label: "Max Length",     hasParam: true, paramLabel: "Length",  placeholder: "255" },
  { value: "allowed_values",label: "Allowed Values", hasParam: true, paramLabel: "Values (comma-sep)", placeholder: "A,B,C" },
];

export const PAGE_SIZE = 50;
export const MAPPING_PAGE_SIZE = 50;

export const DATA_TYPES = ["varchar(255)", "int", "datetime", "decimal(18,2)", "bit", "bigint", "nvarchar(max)"];