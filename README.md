# Locomobile.co

A Vue.js and Flask application.

## Project Setup

### Prerequisites
- Node.js (latest LTS version recommended)
- npm (comes with Node.js)
- Python 3.8 or higher
- pip (Python package manager)

### Frontend Setup
1. Install Node.js dependencies:
```bash
npm install
```

### Backend Setup
1. Navigate to the server directory:
```bash
cd server
```

2. Create a Python virtual environment (optional but recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
- On Windows:
```bash
venv\Scripts\activate
```
- On macOS/Linux:
```bash
source venv/bin/activate
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### Development Mode
To run both the frontend and backend simultaneously:
```bash
npm run start
```

This will start:
- Vue.js frontend at http://localhost:5173
- Flask backend at http://localhost:8000

### Running Frontend Only
```bash
npm run dev
```

### Running Backend Only
```bash
npm run flask
```

## Building for Production
To build the frontend for production:
```bash
npm run build
```

This will generate optimized files in the `dist` directory, which the Flask backend is configured to serve.

To run the production build:
```bash
cd server
python app.py
```

Then visit http://localhost:8000 in your browser.

## API Endpoints

- `/api/hello`: Returns a simple JSON message
