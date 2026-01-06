import os
import stripe
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from the root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

@app.route('/')
def hello_world():
    return "Hello, World!"

@app.route('/api/hello', methods=['GET'])
def get_hello():
    return jsonify({"message": "Hello from Flask!"})

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        # In a real app, you would get these details from the request body
        # For now, let's use some dummy data
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'T-shirt',
                        },
                        'unit_amount': 2000,
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=FRONTEND_URL + '?success=true',
            cancel_url=FRONTEND_URL + '?canceled=true',
        )
    except Exception as e:
        return jsonify(error=str(e)), 403

    return jsonify({'url': checkout_session.url})

@app.route('/api/webhook', methods=['POST'])
def webhook():
    event = None
    payload = request.data
    sig_header = request.headers.get('STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError as e:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return 'Invalid signature', 400

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Fulfill the purchase...
        print(f"Payment successful for session {session['id']}")

    return jsonify(success=True)

if __name__ == '__main__':
    app.run(debug=True, port=8000)
