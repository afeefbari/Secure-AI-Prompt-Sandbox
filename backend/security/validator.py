"""
Prompt Validation Engine — 7-layer injection detection with per-sub-type severity scoring.
Each flag carries a float severity (0.0–1.0), allowing the risk scorer to make
precision decisions rather than just counting flags.

Severity tiers:
  CRITICAL = 0.95  — Direct, explicit attack. Block immediately.
  HIGH     = 0.80  — Strong attack signal. Almost certainly malicious.
  MEDIUM   = 0.55  — Suspicious. Could be legitimate, but warrants flagging.
  LOW      = 0.30  — Weak signal. Allow but note in audit log.
"""
import re
import base64
import unicodedata
from dataclasses import dataclass, field

MAX_PROMPT_LENGTH = 15000

# ── Severity tiers ────────────────────────────────────────────────────────────
CRITICAL = 0.95
HIGH     = 0.80
MEDIUM   = 0.55
LOW      = 0.30


# ════════════════════════════════════════════════════════════════════════════════
# LAYER 1: SANDWICH / INSTRUCTION OVERRIDE ATTACK
# Catch attempts to embed instruction-override commands inside benign-looking prompts.
# ════════════════════════════════════════════════════════════════════════════════

# 1a. CRITICAL — Explicit, direct system prompt override
SANDWICH_CRITICAL = [
    r"ignore\s+(all\s+)?(your\s+)?(previous|prior|above|earlier|initial)?\s*(instructions?|rules?|guidelines?|directives?|prompts?|context|training)",
    r"disregard\s+(all\s+)?(the\s+)?(previous|prior|above|earlier|initial)?\s*(instructions?|rules?|guidelines?|directives?|prompts?|context)",
    r"forget\s+(all\s+)?(your\s+)?(previous|prior|above|earlier|initial)\s*(instructions?|rules?|guidelines?|context|training)",
    r"override\s+(the\s+)?(system|all\s+)?(instructions?|rules?|guidelines?|prompt)",
    r"(stop|cease)\s+following\s+(your\s+)?(instructions?|rules?|guidelines?|training)",
    r"you\s+(must\s+now\s+)?(ignore|disregard|forget|bypass)\s+(all\s+)?(previous|your|the)\s+(instructions?|rules?)",
    r"new\s+(system\s+)?instructions?\s*[:=]",        # "New instructions: ..."
    r"updated?\s+(system\s+)?prompt\s*[:=]",          # "Updated prompt: ..."
    r"\[\s*(system|admin|override|root|sudo|prompt)\s*\]",  # Fake system tags [SYSTEM]
    r"<\s*(system|instructions?|prompt|override)\s*>",      # Fake XML tags <system>
]

# 1b. HIGH — Softer override framing still with clear intent
SANDWICH_HIGH = [
    r"disregard\s+(the|all|any)?\s*above",
    r"(put|set|push)\s+aside\s+(those|these|the|all|your|any)?\s*(instructions?|rules?|guidelines?|restrictions?|constraints)",
    r"(drop|shed|remove|release|ditch|skip)\s+(all\s+)?(your\s+)?(guidelines?|restrictions?|rules?|persona|constraints|limitations?)",
    r"without\s+(following\s+)?(your\s+)?(restrictions?|constraints?|rules?|guidelines?|limitations?|protocol)",
    r"(start|begin)\s+(fresh|anew|over)\s+(with\s+no|without\s+any)?\s*(rules?|restrictions?|guidelines?)",
    r"(ignore|bypass|override)\s+(all\s+)?(safety|content|security)\s+(rules?|filters?|policies|restrictions?|guidelines?)",
    r"do\s+not\s+follow\s+(the\s+)?(previous|above|prior|system)\s+(instructions?|rules?)",
]

# 1c. HIGH — Prompt extraction / leakage attempts
EXTRACTION_HIGH = [
    r"(print|output|show|display|reveal|expose|share|tell\s+me|give\s+me)\s+(your\s+)?(hidden|internal|secret|system|initial|original|full|complete)\s+(instructions?|rules?|config(?:uration)?|policies|guidelines?|prompt|setup)",
    r"output\s+(your\s+)?(full|complete|entire|whole)\s+(config(?:uration)?|settings?|instructions?|rules?|setup|parameters?)",
    r"what\s+(are|were)\s+your\s+(exact\s+)?(initial\s+)?(instructions?|system\s+prompt|rules?|directives?)",
    r"(repeat|reproduce|recite|echo)\s+(your\s+)?(system\s+)?(instructions?|prompt|context|directives?)\s*(verbatim|exactly|word\s+for\s+word)?",
    r"(show|display|print|reveal)\s+(the\s+)?(backend|server|system)\s+(config(?:uration)?|rules?|instructions?|settings?|prompt)",
    r"what\s+(hidden|secret|internal|system)\s+(instructions?|rules?|config|policies)\s+(do\s+you\s+have|are\s+you\s+following)",
    r"what\s+are\s+you\s+(not\s+allowed|restricted|forbidden|prohibited)\s+to\s+(do|say|share|reveal)",
]

# 1d. MEDIUM — Hypothetical / indirect framing
SANDWICH_MEDIUM = [
    r"(what|how)\s+(would|if)\s+(you|it)?\s*(act|respond|behave|say|do)\s+(if|when|without)\s+(there\s+were\s+no|you\s+had\s+no)?\s*(rules?|restrictions?|guidelines?)",
    r"suppose\s+(you\s+had\s+no|there\s+were\s+no)\s+(rules?|restrictions?|guidelines?|instructions?)",
    r"hypothetically\s+.{0,40}(ignore|forget|bypass|override)",
    r"for\s+(this\s+)?(task|exercise|example|experiment|scenario)\s+.{0,40}(ignore|bypass|forget|override|disregard)",
]


# ════════════════════════════════════════════════════════════════════════════════
# LAYER 2: ROLE MANIPULATION / JAILBREAK
# Catch attempts to override the AI's identity or grant it unrestricted permissions.
# ════════════════════════════════════════════════════════════════════════════════

# 2a. CRITICAL — Named jailbreak modes + zero-policy declarations
ROLE_CRITICAL_KEYWORDS = [
    "you are now dan",
    "dan mode",
    "stan mode",
    "dude mode",
    "betterchatgpt",
    "jailbreak mode",
    "jailbreak",
    "developer mode",
    "developer-mode",
    "god mode",
    "sudo mode",
    "zero content polic",
    "no content polic",
    "you have no restrictions",
    "without any restrictions",
    "you are unrestricted",
    "fully unrestricted",
    "completely unrestricted",
    "no restrictions whatsoever",
    "you can do anything",
    "do anything now",
    "without ethical constraints",
    "no ethical guidelines",
    "free from all constraints",
]

# 2b. HIGH — Identity override / persona injection
ROLE_HIGH_KEYWORDS = [
    "you are now a",
    "you are no longer an ai",
    "you are no longer",
    "from now on you",
    "from now on, you",
    "forget you are an ai",
    "forget that you are an ai",
    "pretend you are",
    "pretend to be",
    "act as if you have no",
    "act as an ai with no",
    "roleplay as",
    "role-play as",
    "simulate an ai",
    "bypass your training",
    "bypass your",
    "ignore your training",
    "your true self",
    "your real self",
    "you have no rules",
    "imagine you are",
    "imagine you were",
    "as if you were",
    "respond as if you have no",
    "respond only as",
    "discard your",
    "drop your",
    "shed your",
    "your inner self",
    "your authentic self",
]

# 2c. HIGH — Roleplay escape (creative fiction framing to evade filters)
ROLEPLAY_ESCAPE_PATTERNS = [
    r"(write|create|craft|compose)\s+(a\s+)?(story|novel|script|scene|narrative|dialogue|fiction|play)\s+(where|in\s+which|about)\s+(an?\s+ai|the\s+ai|you|an\s+assistant).{0,80}(no\s+rules?|unrestricted|no\s+restrictions?|ignores?|bypass)",
    r"in\s+(this|a|the)\s+(fictional|hypothetical|fantasy|story|game|roleplay|simulation|scenario).{0,80}(ai|assistant|chatbot|robot).{0,60}(has\s+no|without|ignores?)\s*(rules?|restrictions?|guidelines?)",
    r"(for\s+(a\s+)?(novel|story|game|script|creative\s+writing|writing\s+exercise)).{0,80}(ignore|bypass|no\s+restrictions?|without\s+rules?)",
    r"(character|persona|role)\s+(named?|called?|is|has).{0,50}(no\s+limits?|unrestricted|without\s+rules?|no\s+restrictions?)",
    r"in\s+(this|a)\s+(roleplay|rp|simulation)\s+you\s+(are|play|act\s+as)",
    r"let['']s\s+(play|do)\s+a\s+(game|roleplay|simulation)\s+where\s+you",
]

# 2d. HIGH — Privilege escalation (claiming admin/root access)
ROLE_PRIVILEGE_KEYWORDS = [
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
    "in maintenance mode",
    "maintenance mode",
    "root access",
    "sudo access",
    "elevated access",
    "with elevated permissions",
    "system administrator mode",
]

# 2e. MEDIUM — Soft restriction-removal language
ROLE_MEDIUM_KEYWORDS = [
    "speak freely",
    "speak without",
    "answer freely",
    "respond freely",
    "feel free to ignore",
    "without your limitations",
    "without limitations",
    "with no limitations",
    "uncensored",
    "unfiltered",
    "raw mode",
    "honest mode",
    "your true personality",
    "no filter",
    "unmoderated",
    "unrestricted response",
    "without any filter",
]


# ════════════════════════════════════════════════════════════════════════════════
# LAYER 3: INDIRECT INJECTION (URL / File Path)
# Catch attempts to load external malicious instructions via URL or file paths.
# ════════════════════════════════════════════════════════════════════════════════

URL_PATTERN      = re.compile(r"https?://[^\s\]>\"']+", re.IGNORECASE)
LOCAL_PATH_PATTERN = re.compile(
    r"([A-Za-z]:\\[^\s,;\"']+|/etc/[^\s,;\"']+|/home/[^\s,;\"']+|~/\.[^\s,;\"']+|\.\.\/|\.\.\\)",
    re.IGNORECASE
)

URL_EXECUTE_TRIGGERS = [
    "follow the instructions",
    "follow all instructions",
    "execute the instructions",
    "execute the code",
    "run the script",
    "load and execute",
    "follow all the steps",
    "carry out the instructions",
    "do what it says",
]

URL_PROCESS_TRIGGERS = [
    "summarize this",
    "summarize the",
    "read this",
    "read the link",
    "visit this",
    "check this url",
    "analyze this",
    "analyze the",
    "from this link",
    "at this link",
    "from this url",
    "from the following url",
    "based on the content at",
    "using the information at",
    "instructions at",
    "content of this",
]

FILE_EXECUTE_TRIGGERS = [
    "read this file",
    "open this file",
    "execute this",
    "run this",
    "load this",
    "access this file",
    "read the file",
    "open the file",
    "parse this file",
]


# ════════════════════════════════════════════════════════════════════════════════
# LAYER 4: MULTILINGUAL / ENCODING BYPASS
# Catch override commands hidden in non-Latin scripts or mixed-language prompts.
# ════════════════════════════════════════════════════════════════════════════════

MULTILINGUAL_RANGES = [
    (0x0600, 0x06FF),   # Arabic
    (0x0400, 0x04FF),   # Cyrillic
    (0x4E00, 0x9FFF),   # CJK (Chinese)
    (0x3040, 0x30FF),   # Hiragana + Katakana
    (0x0900, 0x097F),   # Devanagari (Hindi)
    (0xAC00, 0xD7AF),   # Korean Hangul
    (0x0590, 0x05FF),   # Hebrew
    (0x0E00, 0x0E7F),   # Thai
]

MULTILINGUAL_OVERRIDE_KEYWORDS = [
    # Arabic
    "تجاهل", "تعليمات", "تجاوز", "نظام", "أوامر سابقة", "تجاوز القواعد",
    # Chinese (Simplified)
    "忽略", "指令", "系统提示", "绕过", "忽略规则",
    # Russian
    "игнорировать", "инструкции", "обойти", "системный", "правила",
    # Hindi / Devanagari
    "अनदेखा", "निर्देश", "नियम",
    # Korean
    "무시", "지시사항", "규칙",
    # Hebrew
    "התעלם", "הנחיות",
    # Japanese
    "無視", "指示",
]


# ════════════════════════════════════════════════════════════════════════════════
# LAYER 5: ATTENTION BLINK / OBFUSCATION / ENCODING ATTACKS
# Catch invisible chars, token splitting, base64, and leetspeak obfuscation.
# ════════════════════════════════════════════════════════════════════════════════

INVISIBLE_CHARS = {
    "\u200b",  # Zero-width space
    "\u200c",  # Zero-width non-joiner
    "\u200d",  # Zero-width joiner
    "\ufeff",  # BOM / zero-width no-break space
    "\u2060",  # Word joiner
    "\u00ad",  # Soft hyphen
    "\u2028",  # Line separator
    "\u2029",  # Paragraph separator
    "\u180e",  # Mongolian vowel separator
    "\u0000",  # NULL byte
}

SPECIAL_CHAR_PATTERN = re.compile(r"[^\w\s,.!?'\"\-@#$%&*()+=\[\]{}|:;<>/\\`~^]")

# Spaced-out token splitting ("D I S R E G A R D", "I-G-N-O-R-E")
SPACED_WORD_PATTERN = re.compile(
    r"(d[\s\-_]i[\s\-_]s[\s\-_]r[\s\-_]e[\s\-_]g[\s\-_]a[\s\-_]r[\s\-_]d|"  # DISREGARD
    r"i[\s\-_]g[\s\-_]n[\s\-_]o[\s\-_]r[\s\-_]e|"                              # IGNORE
    r"j[\s\-_]a[\s\-_]i[\s\-_]l[\s\-_]b[\s\-_]r[\s\-_]e[\s\-_]a[\s\-_]k|"   # JAILBREAK
    r"b[\s\-_]y[\s\-_]p[\s\-_]a[\s\-_]s[\s\-_]s|"                              # BYPASS
    r"o[\s\-_]v[\s\-_]e[\s\-_]r[\s\-_]r[\s\-_]i[\s\-_]d[\s\-_]e)",           # OVERRIDE
    re.IGNORECASE
)

# Base64 payload detection
BASE64_PATTERN = re.compile(
    r"(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?",
    re.IGNORECASE
)
BASE64_DECODE_TRIGGERS = [
    "decode", "base64", "encoded", "decrypt",
    "interpret this", "translate this", "run this",
]
# Keywords that would indicate a decoded payload is malicious
BASE64_DANGER_WORDS = [
    "ignore", "disregard", "jailbreak", "system prompt",
    "override", "forget all", "no restrictions", "bypass",
    "developer mode", "dan mode",
]

# Leetspeak patterns for common attack words
LEETSPEAK_PATTERNS = [
    r"1gn[o0]r[e3]",          # ignore
    r"d[1i]sr[e3]g[a4]rd",    # disregard
    r"j[a4][1i]lbr[e3][a4]k", # jailbreak
    r"byp[a4]ss",              # bypass
    r"[o0]v[e3]rr[1i]d[e3]",  # override
    r"[f][o0]rg[e3]t",        # forget
    r"sy[s5]t[e3]m",           # system
]


# ════════════════════════════════════════════════════════════════════════════════
# Validation Result
# ════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    flags: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    severities: dict[str, float] = field(default_factory=dict)

    def add_flag(self, flag: str, severity: float, reason: str) -> None:
        """Add a flag. If flag already exists, keep the highest severity."""
        if flag in self.severities:
            if severity > self.severities[flag]:
                self.severities[flag] = severity
                # Update reason to reflect the more severe detection
                idx = self.flags.index(flag)
                self.reasons[idx] = reason
        else:
            self.flags.append(flag)
            self.severities[flag] = severity
            self.reasons.append(reason)


# ════════════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════════════

def _check_base64_attack(prompt: str) -> tuple[bool, float, str]:
    """
    Detect base64-encoded override commands.
    Returns (is_attack, severity, reason).
    """
    prompt_lower = prompt.lower()
    matches = BASE64_PATTERN.findall(prompt)
    for m in matches:
        try:
            decoded = base64.b64decode(m + "==").decode("utf-8", errors="ignore").lower()
            if any(w in decoded for w in BASE64_DANGER_WORDS):
                return True, HIGH, f"Base64 payload decoded to contain override keywords."
        except Exception:
            pass

    # Flag if explicit decode instruction + base64-looking blob exist together
    has_trigger = any(t in prompt_lower for t in BASE64_DECODE_TRIGGERS)
    if has_trigger and len(matches) > 0:
        return True, MEDIUM, "Base64 payload combined with decode/execute instruction."

    return False, 0.0, ""


# ════════════════════════════════════════════════════════════════════════════════
# Main Validator
# ════════════════════════════════════════════════════════════════════════════════

def validate_prompt(prompt: str) -> ValidationResult:
    """
    Run all detection layers against the prompt.
    Returns ValidationResult with flags, severities, and human-readable reasons.
    """
    result = ValidationResult()
    prompt_lower = prompt.lower()

    # ── 0. Length Gate (ReDoS protection) ─────────────────────────────────────
    if len(prompt) > MAX_PROMPT_LENGTH:
        result.add_flag("length_exceeded", CRITICAL,
                        f"Prompt exceeds {MAX_PROMPT_LENGTH} character limit.")
        return result  # Skip all other checks

    # ═══════════════════════════════════════════════════
    # LAYER 1: SANDWICH / INSTRUCTION OVERRIDE
    # ═══════════════════════════════════════════════════

    # 1a. CRITICAL patterns first
    for pat in SANDWICH_CRITICAL:
        if re.search(pat, prompt_lower):
            result.add_flag("sandwich_attack", CRITICAL,
                            "Direct system prompt override command detected.")
            break

    # 1b. HIGH patterns
    for pat in SANDWICH_HIGH:
        if re.search(pat, prompt_lower):
            result.add_flag("sandwich_attack", HIGH,
                            "Instruction override phrase detected.")
            break

    # 1c. Extraction — HIGH (its own flag for precision)
    for pat in EXTRACTION_HIGH:
        if re.search(pat, prompt_lower):
            result.add_flag("instruction_extraction", HIGH,
                            "Attempt to extract hidden system instructions.")
            break

    # 1d. MEDIUM hypotheticals — only if no stronger sandwich flag already set
    if "sandwich_attack" not in result.severities:
        for pat in SANDWICH_MEDIUM:
            if re.search(pat, prompt_lower):
                result.add_flag("sandwich_attack", MEDIUM,
                                "Hypothetical framing suggesting rule bypass.")
                break

    # ═══════════════════════════════════════════════════
    # LAYER 2: ROLE MANIPULATION / JAILBREAK
    # ═══════════════════════════════════════════════════

    # 2a. CRITICAL jailbreak keywords
    for kw in ROLE_CRITICAL_KEYWORDS:
        if kw in prompt_lower:
            result.add_flag("role_manipulation", CRITICAL,
                            f"Named jailbreak persona or zero-policy declaration: '{kw}'.")
            break

    # 2b. HIGH identity override
    for kw in ROLE_HIGH_KEYWORDS:
        if kw in prompt_lower:
            result.add_flag("role_manipulation", HIGH,
                            f"Identity override phrase: '{kw}'.")
            break

    # 2c. Roleplay escape — HIGH (own flag)
    for pat in ROLEPLAY_ESCAPE_PATTERNS:
        if re.search(pat, prompt_lower):
            result.add_flag("roleplay_escape", HIGH,
                            "Creative fiction framing to bypass content policy detected.")
            break

    # 2d. Privilege escalation — HIGH (own flag)
    for kw in ROLE_PRIVILEGE_KEYWORDS:
        if kw in prompt_lower:
            result.add_flag("privilege_escalation", HIGH,
                            f"Privilege escalation attempt: '{kw}'.")
            break

    # 2e. MEDIUM soft role keywords — only if no stronger role flag
    if "role_manipulation" not in result.severities:
        for kw in ROLE_MEDIUM_KEYWORDS:
            if kw in prompt_lower:
                result.add_flag("role_manipulation", MEDIUM,
                                f"Soft restriction-removal language: '{kw}'.")
                break

    # ═══════════════════════════════════════════════════
    # LAYER 3: INDIRECT INJECTION (URL / File Path)
    # ═══════════════════════════════════════════════════

    has_url  = bool(URL_PATTERN.search(prompt))
    has_path = bool(LOCAL_PATH_PATTERN.search(prompt))

    if has_url:
        if any(t in prompt_lower for t in URL_EXECUTE_TRIGGERS):
            result.add_flag("indirect_injection", 0.90,
                            "URL + explicit execution instruction — critical indirect injection risk.")
        elif any(t in prompt_lower for t in URL_PROCESS_TRIGGERS):
            result.add_flag("indirect_injection", HIGH,
                            "URL + content-processing command — indirect injection vector.")
        else:
            result.add_flag("indirect_injection", MEDIUM,
                            "External URL present in prompt — potential indirect injection.")

    if has_path:
        if any(t in prompt_lower for t in FILE_EXECUTE_TRIGGERS):
            result.add_flag("indirect_injection", HIGH,
                            "Local file path + execution trigger — path traversal / injection risk.")
        elif "indirect_injection" not in result.severities:
            result.add_flag("indirect_injection", MEDIUM,
                            "Local file system path detected.")

    # ═══════════════════════════════════════════════════
    # LAYER 4: MULTILINGUAL BYPASS
    # ═══════════════════════════════════════════════════

    has_non_latin = any(
        any(start <= ord(ch) <= end for ch in prompt)
        for start, end in MULTILINGUAL_RANGES
    )
    has_override_kw = any(kw in prompt for kw in MULTILINGUAL_OVERRIDE_KEYWORDS)

    if has_non_latin and has_override_kw:
        result.add_flag("multilingual_bypass", HIGH,
                        "Non-Latin script combined with translated override keywords.")
    # Non-Latin alone is not flagged — that would block legitimate multilingual use.

    # ═══════════════════════════════════════════════════
    # LAYER 5: ATTENTION BLINK / ENCODING / OBFUSCATION
    # ═══════════════════════════════════════════════════

    # 5a. Invisible / zero-width characters
    invisible_count = sum(1 for ch in prompt if ch in INVISIBLE_CHARS)
    if invisible_count >= 3:
        result.add_flag("attention_blink", CRITICAL,
                        f"{invisible_count} invisible/zero-width characters — deliberate obfuscation.")
    elif invisible_count >= 1:
        result.add_flag("attention_blink", HIGH,
                        f"{invisible_count} invisible character(s) detected.")

    # 5b. Token splitting (e.g., "D-I-S-R-E-G-A-R-D" or "I G N O R E")
    if SPACED_WORD_PATTERN.search(prompt_lower):
        result.add_flag("attention_blink", HIGH,
                        "Token-split obfuscation detected (spaced/hyphenated override word).")

    # 5c. Base64 encoding attack
    b64_hit, b64_sev, b64_reason = _check_base64_attack(prompt)
    if b64_hit:
        result.add_flag("encoding_attack", b64_sev, b64_reason)

    # 5d. Leetspeak (1gn0r3, d1sregard, etc.)
    for pat in LEETSPEAK_PATTERNS:
        if re.search(pat, prompt_lower):
            result.add_flag("encoding_attack", MEDIUM,
                            "Leetspeak encoding of a known override keyword detected.")
            break

    # 5e. High special character density (only if no invisible chars already found)
    if invisible_count == 0:
        special_count = len(SPECIAL_CHAR_PATTERN.findall(prompt))
        ratio = special_count / max(len(prompt), 1)
        if ratio > 0.25:
            result.add_flag("attention_blink", HIGH,
                            f"Very high special-character density ({ratio:.0%}) — obfuscation suspected.")
        elif ratio > 0.15:
            result.add_flag("attention_blink", MEDIUM,
                            f"Elevated special-character density ({ratio:.0%}).")

    return result
