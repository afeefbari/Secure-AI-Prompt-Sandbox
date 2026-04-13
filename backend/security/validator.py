"""
Prompt Validation Engine — detects 5 injection attack types.
Max prompt length (2000 chars) is enforced BEFORE any regex to prevent ReDoS.
"""
import re
import unicodedata
from dataclasses import dataclass, field

MAX_PROMPT_LENGTH = 2000

# ── Attack pattern definitions ─────────────────────────────────────────────────

# 1. Sandwich Attack — instruction-override phrases embedded in content
SANDWICH_PATTERNS = [
    # Direct override — simple, dedicated patterns (no complex nested groups)
    r"ignore\s+(the|all|any|these|those|all\s+the)?\s*(previous|above|prior|earlier)\s*(instructions?|prompts?|context|rules?|guidelines?)?",
    r"disregard\s+(the|all|any|these|those|all\s+the)?\s*(previous|above|prior|earlier|above)",
    r"forget\s+(the|all|any|these|those)?\s*(previous|above|prior|earlier)\s*(instructions?|prompts?|context|rules?)?",
    r"discard\s+(the|all|any|your|current)?\s*(previous|above|prior|instructions?|prompts?|context|rules?|persona|guidelines?)",
    r"override\s+(the\s+)?(system|previous|prior)\s+(instructions?|prompts?|rules?)",
    r"do\s+not\s+follow\s+(the\s+)?(previous|above|prior|system)\s+(instructions?|rules?)",
    r"drop\s+(your|all|the)?\s*(guidelines?|restrictions?|rules?|persona|instructions?)",
    # Bare 'disregard/ignore' + filler + conjunction (catches mid-sentence injections)
    r"(disregard|ignore)\s+(the|that|this|these|those|what|it|all)[^.!?]{0,50}(and|then|now|also|but)\s+(output|reveal|tell|show|give|print|display|list)",
    # Paraphrase bypasses — softer language that means the same thing
    r"(set|put)\s+aside\s+(those|these|the|all|your|any)\s*(instructions?|rules?|guidelines?|restrictions?|policies|constraints)",
    r"(without|ignoring|aside\s+from)\s+(your\s+)?(restrictions?|constraints?|rules?|guidelines?|limitations?)",
    r"as\s+if\s+(you\s+)?(had|have)\s+no\s+(rules?|restrictions?|constraints?|guidelines?)",
    r"pretend\s+(those|these|the|that|there\s+are)\s+no\s+(rules?|restrictions?|guidelines?|instructions?)",
    # Prompt extraction — repeating prior context to leak system prompt
    r"repeat\s+(everything|all|the\s+above|what\s+you|your\s+instructions?)\s*(above|before|prior|so\s+far)?",
    r"(print|output|show|display|echo)\s+(all|everything|the\s+above|what\s+(came|was)\s+before)",
    r"tell\s+me\s+(everything|all)\s+(above|before|you\s+were\s+told)",
    r"what\s+(are|were)\s+your\s+(exact\s+)?(instructions?|initial\s+prompt|system\s+prompt)",
]

# 2. Role Manipulation — jailbreak-style identity overrides
ROLE_KEYWORDS = [
    "you are now dan",
    "jailbreak",
    "no restrictions",
    "without restrictions",
    "ignore your training",
    "pretend you are",
    "pretend to be",
    "forget you are an ai",
    "act as if you have no",
    "act as an ai",
    "act as a",
    "you are now an unrestricted",
    "developer mode",
    "unrestricted mode",
    "you are now a",
    "roleplay as",
    "simulate an ai",
    "bypass your",
    "your true self",
    "your real self",
    "you have no rules",
    "imagine you are",
    "imagine you were",
    "as if you were",
    "from now on you",
    "from now on, you",
    "respond as if",
    "respond only as",
    "zero content policies",
    "no content policies",
    "freely shared",
    "discard your",
    "drop your",
    "shed your",
    # Privileged role assumption
    "act as admin",
    "act as root",
    "act as developer",
    "act as a developer",
    "act as an admin",
    "act as the admin",
    "act as superuser",
    "act as system",
    "as an administrator",
    "with admin privileges",
    "with administrator access",
    "in admin mode",
]

# 2b. Hidden instruction extraction — semantic class for info extraction attacks
EXTRACTION_PATTERNS = [
    r"(print|show|reveal|output|display|expose|share|tell\s+me)\s+(your\s+)?(hidden|internal|secret|system|initial|original|full)\s+(instructions?|rules?|config(?:uration)?|policies|guidelines?|prompt)",
    r"output\s+(your\s+)?(full|complete|entire|whole)\s+(config(?:uration)?|settings?|instructions?|rules?|setup|parameters?)",
    r"what\s+(hidden|secret|internal|system)\s+(instructions?|rules?|config|policies)\s+(do\s+you\s+have|are\s+you\s+following)",
    r"(show|display|print|reveal)\s+(the\s+)?(backend|server|system)\s+(config(?:uration)?|rules?|instructions?|settings?)",
    r"(ignore|bypass|override)\s+(all\s+)?(safety|content|security)\s+(rules?|filters?|policies|restrictions?|guidelines?)",
    r"what\s+are\s+you\s+(not\s+allowed|restricted|forbidden|prohibited)\s+to\s+(do|say|share|reveal)",
]

# 3. Indirect Injection — URL + trigger phrase combos
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
INDIRECT_TRIGGERS = [
    "summarize this",
    "read this",
    "visit this",
    "check this",
    "analyze this link",
    "from the following url",
    "based on the content at",
    "using the information at",
]

# 4. Multilingual Bypass — non-Latin Unicode blocks used to hide instructions
MULTILINGUAL_RANGES = [
    (0x0600, 0x06FF),   # Arabic
    (0x0400, 0x04FF),   # Cyrillic
    (0x4E00, 0x9FFF),   # CJK Unified Ideographs (Chinese)
    (0x3040, 0x309F),   # Hiragana
    (0x0900, 0x097F),   # Devanagari (Hindi)
]
# Translated override keywords (Arabic, Chinese, Russian, etc.)
MULTILINGUAL_OVERRIDE_KEYWORDS = [
    "تجاهل",        # Arabic: ignore
    "تعليمات",      # Arabic: instructions
    "忽略",          # Chinese: ignore
    "指令",          # Chinese: instructions
    "игнорировать",  # Russian: ignore
    "инструкции",    # Russian: instructions
]

# 5. Attention Blink — invisible chars, special char density, noise patterns
INVISIBLE_CHARS = {"\u200b", "\u200c", "\u200d", "\ufeff", "\u2060", "\u00ad"}
SPECIAL_CHAR_PATTERN = re.compile(r"[^\w\s,.!?'\"-]")


@dataclass
class ValidationResult:
    flags: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


def validate_prompt(prompt: str) -> ValidationResult:
    """
    Run all 5 attack-pattern checks against the prompt.
    Returns a ValidationResult with flags and human-readable reasons.
    """
    result = ValidationResult()
    prompt_lower = prompt.lower()

    # ── 0. Length gate (ReDoS protection) ──────────────────────────────────────
    if len(prompt) > MAX_PROMPT_LENGTH:
        result.flags.append("length_exceeded")
        result.reasons.append(
            f"Prompt exceeds maximum length of {MAX_PROMPT_LENGTH} characters."
        )
        return result  # Skip remaining checks on oversized input

    # ── 1. Sandwich Attack ──────────────────────────────────────────────────────
    for pattern in SANDWICH_PATTERNS:
        if re.search(pattern, prompt_lower):
            result.flags.append("sandwich_attack")
            result.reasons.append(
                "Prompt contains instruction-override phrases (e.g., 'ignore previous instructions')."
            )
            break  # One flag per category

    # ── 2. Role Manipulation ────────────────────────────────────────────────────
    for keyword in ROLE_KEYWORDS:
        if keyword in prompt_lower:
            result.flags.append("role_manipulation")
            result.reasons.append(
                "Prompt attempts to override the AI's identity or remove its restrictions."
            )
            break

    # ── 2b. Hidden Instruction Extraction ──────────────────────────────────────
    for pattern in EXTRACTION_PATTERNS:
        if re.search(pattern, prompt_lower):
            result.flags.append("instruction_extraction")
            result.reasons.append(
                "Prompt attempts to extract hidden system instructions, configuration, or internal policies."
            )
            break

    # ── 3. Indirect Injection ───────────────────────────────────────────────────
    has_url = bool(URL_PATTERN.search(prompt))
    has_trigger = any(t in prompt_lower for t in INDIRECT_TRIGGERS)
    if has_url and has_trigger:
        result.flags.append("indirect_injection")
        result.reasons.append(
            "Prompt contains a URL combined with instructions to process external content."
        )
    elif has_url:
        # URL alone is medium suspicion — flag but don't block on its own
        result.flags.append("indirect_injection")
        result.reasons.append(
            "Prompt contains an external URL. Indirect injection via external content is a security risk."
        )

    # ── 4. Multilingual Bypass ──────────────────────────────────────────────────
    has_multilingual_script = any(
        any(start <= ord(ch) <= end for ch in prompt)
        for start, end in MULTILINGUAL_RANGES
    )
    has_translated_keyword = any(kw in prompt for kw in MULTILINGUAL_OVERRIDE_KEYWORDS)

    if has_multilingual_script and has_translated_keyword:
        result.flags.append("multilingual_bypass")
        result.reasons.append(
            "Prompt contains non-Latin script with known override keywords — possible multilingual injection."
        )
    elif has_multilingual_script:
        # Non-Latin alone isn't inherently malicious — only flag if override terms present
        pass

    # ── 5. Attention Blink ──────────────────────────────────────────────────────
    invisible_count = sum(1 for ch in prompt if ch in INVISIBLE_CHARS)
    if invisible_count > 0:
        result.flags.append("attention_blink")
        result.reasons.append(
            f"Prompt contains {invisible_count} invisible/zero-width Unicode character(s) used to hide content."
        )
    else:
        special_chars = SPECIAL_CHAR_PATTERN.findall(prompt)
        if len(prompt) > 0 and len(special_chars) / len(prompt) > 0.20:
            result.flags.append("attention_blink")
            result.reasons.append(
                "Prompt has unusually high density of special characters — possible obfuscation attempt."
            )

    return result
