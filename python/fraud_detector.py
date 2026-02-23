"""
Fraud Message Detection API
AI-powered fraud detection using NLP and pattern matching
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from typing import Dict, List, Tuple

app = Flask(__name__)
CORS(app)

# Fraud keywords and patterns
FRAUD_KEYWORDS = {
    'urgent': 3,
    'verify': 2,
    'suspended': 3,
    'account': 2,
    'click': 2,
    'immediately': 3,
    'confirm': 2,
    'password': 3,
    'otp': 3,
    'pin': 3,
    'bank': 2,
    'credit card': 3,
    'social security': 4,
    'ssn': 4,
    'prize': 3,
    'winner': 3,
    'congratulations': 2,
    'claim': 2,
    'refund': 2,
    'tax': 2,
    'irs': 3,
    'government': 2,
    'lottery': 3,
    'inheritance': 3,
    'million': 3,
    'dollars': 2,
    'wire transfer': 4,
    'bitcoin': 3,
    'cryptocurrency': 3,
    'gift card': 4,
    'amazon': 2,
    'paypal': 2,
    'venmo': 2,
    'zelle': 2,
    'cashapp': 2,
    'limited time': 3,
    'act now': 3,
    'expires': 2,
    'final notice': 4,
    'legal action': 4,
    'arrest': 4,
    'warrant': 4,
    'debt': 2,
    'owed': 2,
    'payment': 2,
    'overdue': 3,
}

# Suspicious URL patterns
SUSPICIOUS_URL_PATTERNS = [
    r'bit\.ly',
    r'tinyurl',
    r'goo\.gl',
    r't\.co',
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}',  # IP addresses
    r'[a-z0-9-]+\.tk',  # Free domains
    r'[a-z0-9-]+\.ml',
    r'[a-z0-9-]+\.ga',
    r'[a-z0-9-]+\.cf',
    r'[a-z0-9-]+\.gq',
]

# Urgency patterns
URGENCY_PATTERNS = [
    r'within \d+ (hours?|minutes?|days?)',
    r'expires? (today|tonight|soon)',
    r'act (now|immediately|fast)',
    r'limited time',
    r'hurry',
    r'don\'t (wait|delay)',
]

# Request for sensitive info patterns
SENSITIVE_INFO_PATTERNS = [
    r'(enter|provide|confirm|verify).{0,20}(password|pin|otp|ssn|social security)',
    r'(click|tap).{0,30}(link|here|below)',
    r'reply.{0,20}(with|your).{0,20}(password|pin|otp|code)',
]


def analyze_keywords(message: str) -> Tuple[int, List[str]]:
    """Analyze message for fraud keywords"""
    message_lower = message.lower()
    score = 0
    matches = []
    
    for keyword, weight in FRAUD_KEYWORDS.items():
        if keyword in message_lower:
            score += weight
            matches.append(keyword)
    
    # Normalize score to 0-100
    max_possible = 50  # Reasonable max for keyword matching
    normalized_score = min(100, int((score / max_possible) * 100))
    
    return normalized_score, matches


def analyze_urls(message: str) -> Tuple[int, List[str]]:
    """Analyze URLs in message"""
    suspicious_urls = []
    
    # Find all URLs
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, message)
    
    for url in urls:
        for pattern in SUSPICIOUS_URL_PATTERNS:
            if re.search(pattern, url, re.IGNORECASE):
                suspicious_urls.append(url)
                break
    
    # Score based on number of suspicious URLs
    score = min(100, len(suspicious_urls) * 40)
    
    return score, suspicious_urls


def analyze_urgency(message: str) -> int:
    """Analyze urgency indicators"""
    score = 0
    
    for pattern in URGENCY_PATTERNS:
        if re.search(pattern, message, re.IGNORECASE):
            score += 20
    
    return min(100, score)


def analyze_sensitive_requests(message: str) -> int:
    """Analyze requests for sensitive information"""
    score = 0
    
    for pattern in SENSITIVE_INFO_PATTERNS:
        if re.search(pattern, message, re.IGNORECASE):
            score += 30
    
    return min(100, score)


def simple_nlp_fraud_score(message: str) -> Tuple[float, str, float]:
    """
    Simple NLP-based fraud detection
    Returns: (fraud_score, label, confidence)
    """
    message_lower = message.lower()
    
    # Count fraud indicators
    fraud_indicators = 0
    total_checks = 0
    
    # Check 1: Multiple exclamation marks
    total_checks += 1
    if message.count('!') >= 2:
        fraud_indicators += 1
    
    # Check 2: ALL CAPS words
    total_checks += 1
    words = message.split()
    caps_words = [w for w in words if w.isupper() and len(w) > 2]
    if len(caps_words) >= 2:
        fraud_indicators += 1
    
    # Check 3: Urgency language
    total_checks += 1
    if any(word in message_lower for word in ['urgent', 'immediately', 'now', 'hurry']):
        fraud_indicators += 1
    
    # Check 4: Request for action
    total_checks += 1
    if any(word in message_lower for word in ['click', 'verify', 'confirm', 'update']):
        fraud_indicators += 1
    
    # Check 5: Threats or consequences
    total_checks += 1
    if any(word in message_lower for word in ['suspend', 'close', 'block', 'arrest', 'legal']):
        fraud_indicators += 1
    
    # Check 6: Financial terms
    total_checks += 1
    if any(word in message_lower for word in ['account', 'bank', 'payment', 'refund', 'prize']):
        fraud_indicators += 1
    
    # Calculate score
    fraud_score = (fraud_indicators / total_checks) * 100
    
    # Determine label and confidence
    if fraud_score >= 60:
        label = "fraud"
        confidence = fraud_score / 100
    elif fraud_score >= 40:
        label = "suspicious"
        confidence = 0.5 + (fraud_score - 40) / 40 * 0.3
    else:
        label = "safe"
        confidence = 1 - (fraud_score / 100)
    
    return fraud_score, label, confidence


def detect_fraud(message: str) -> Dict:
    """Main fraud detection function"""
    
    # Run all analyses
    keyword_score, keyword_matches = analyze_keywords(message)
    url_score, suspicious_urls = analyze_urls(message)
    urgency_score = analyze_urgency(message)
    sensitive_score = analyze_sensitive_requests(message)
    nlp_score, nlp_label, nlp_confidence = simple_nlp_fraud_score(message)
    
    # Calculate overall risk score (weighted average)
    risk_score = int(
        (nlp_score * 0.4) +
        (keyword_score * 0.25) +
        (url_score * 0.2) +
        (urgency_score * 0.1) +
        (sensitive_score * 0.05)
    )
    
    # Determine classification
    classification = "fraud" if risk_score >= 50 else "safe"
    
    # Generate explanations
    explanations = []
    
    if nlp_score >= 60:
        explanations.append(f"AI detected high fraud probability ({nlp_score:.0f}%)")
    
    if keyword_matches:
        top_keywords = keyword_matches[:3]
        explanations.append(f"Contains fraud keywords: {', '.join(top_keywords)}")
    
    if suspicious_urls:
        explanations.append(f"Contains {len(suspicious_urls)} suspicious URL(s)")
    
    if urgency_score >= 40:
        explanations.append("Uses urgent/pressure language")
    
    if sensitive_score >= 30:
        explanations.append("Requests sensitive information")
    
    if not explanations:
        explanations.append("No significant fraud indicators detected")
    
    return {
        "classification": classification,
        "risk_score": risk_score,
        "explanations": explanations,
        "details": {
            "nlp": {
                "fraud_score": round(nlp_score, 1),
                "label": nlp_label,
                "confidence": round(nlp_confidence, 2)
            },
            "keywords": {
                "score": keyword_score,
                "matches": keyword_matches[:5]  # Top 5
            },
            "urls": {
                "score": url_score,
                "suspicious_urls": suspicious_urls
            },
            "urgency_score": urgency_score,
            "sensitive_info_score": sensitive_score
        }
    }


@app.route('/detect', methods=['POST'])
def detect():
    """Fraud detection endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                "error": "Missing 'message' field in request"
            }), 400
        
        message = data['message']
        
        if not message or not message.strip():
            return jsonify({
                "error": "Message cannot be empty"
            }), 400
        
        # Perform fraud detection
        result = detect_fraud(message)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "fraud-detection-api"
    }), 200


if __name__ == '__main__':
    print("=" * 60)
    print("Fraud Message Detection API")
    print("=" * 60)
    print("Starting server on http://localhost:8000")
    print("Endpoints:")
    print("  POST /detect - Analyze message for fraud")
    print("  GET  /health - Health check")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=8000, debug=True)
