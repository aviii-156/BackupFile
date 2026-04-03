# QuickMedi AI

AI-powered medicine and prescription management system built with FastAPI and Google Gemini.

## Features

- **Prescription OCR**: Extract text and medicine information from prescription images
- **Medicine Matching**: Find alternative medicines and generic equivalents
- **Safety Checking**: Validate medicine safety and check for contraindications
- **Interaction Checking**: Detect drug-drug, drug-food, and drug-supplement interactions
- **Duplicate Detection**: Identify duplicate medicines in prescriptions
- **Savings Calculator**: Calculate potential savings from generic alternatives
- **AI Chatbot**: Answer medical queries and provide medicine information
- **Prescription Analysis**: Comprehensive analysis of prescriptions

## Project Structure

```
quickmedi-ai/
│
├── models/                 # AI model classes
│   ├── medicine_matcher.py
│   ├── safety_checker.py
│   ├── interaction_checker.py
│   ├── duplicate_checker.py
│   └── savings_calculator.py
│
├── routes/                 # API route handlers
│   ├── ai_routes.py
│   ├── ocr_routes.py
│   ├── medicine_routes.py
│   ├── interaction_routes.py
│   └── chatbot_routes.py
│
├── services/               # Business logic services
│   ├── ocr_service.py
│   ├── medicine_service.py
│   ├── gemini_service.py
│   ├── chatbot_service.py
│   └── image_service.py
│
├── utils/                  # Utility functions
│   ├── prompt_builder.py
│   ├── response_parser.py
│   ├── data_loader.py
│   └── validators.py
│
├── config/                 # Configuration files
│   ├── settings.py
│   └── ai_config.py
│
├── schemas/                # Pydantic schemas
│   ├── prescription_schema.py
│   ├── medicine_schema.py
│   └── response_schema.py
│
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables
```

## Installation

### Prerequisites

- Python 3.9 or higher
- Tesseract OCR (for prescription text extraction)
- Google Gemini API key

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd quickmedi-ai
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Tesseract OCR:
   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
   - **macOS**: `brew install tesseract`
   - **Windows**: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

5. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

6. Run the application:
```bash
python main.py
```

Or using uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration

### Required Environment Variables

```env
GEMINI_API_KEY=your-gemini-api-key
```

### Optional Configuration

See `.env` file for all available configuration options.

## API Documentation

Once the application is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### AI Routes
- `POST /api/ai/analyze` - Analyze prescription
- `POST /api/ai/validate` - Validate prescription
- `POST /api/ai/suggest-alternatives` - Suggest alternative medicines
- `POST /api/ai/safety-check` - Check medicine safety

### OCR Routes
- `POST /api/ocr/upload` - Upload and process prescription image
- `POST /api/ocr/extract-medicines` - Extract medicines from image
- `POST /api/ocr/parse-prescription` - Parse complete prescription

### Medicine Routes
- `POST /api/medicines/search` - Search for medicines
- `GET /api/medicines/alternatives/{medicine_name}` - Get alternatives
- `GET /api/medicines/details/{medicine_name}` - Get medicine details
- `POST /api/medicines/compare` - Compare medicines

### Interaction Routes
- `POST /api/interactions/check-drugs` - Check drug interactions
- `POST /api/interactions/check-food` - Check food interactions
- `POST /api/interactions/check-supplements` - Check supplement interactions
- `GET /api/interactions/check-alcohol/{medicine_name}` - Check alcohol interaction

### Chatbot Routes
- `POST /api/chatbot/ask` - Ask a medical question
- `POST /api/chatbot/medicine-info` - Get medicine information
- `POST /api/chatbot/symptom-check` - Check symptoms
- `WS /api/chatbot/ws/{client_id}` - WebSocket connection

## Usage Examples

### Analyze Prescription

```python
import requests

url = "http://localhost:8000/api/ai/analyze"
data = {
    "medicines": [
        {
            "name": "Paracetamol",
            "dosage": "500mg",
            "frequency": "3 times a day"
        }
    ]
}

response = requests.post(url, json=data)
print(response.json())
```

### Upload Prescription Image

```python
import requests

url = "http://localhost:8000/api/ocr/upload"
files = {"file": open("prescription.jpg", "rb")}

response = requests.post(url, files=files)
print(response.json())
```

### Check Drug Interactions

```python
import requests

url = "http://localhost:8000/api/interactions/check-drugs"
data = {
    "medicines": ["Aspirin", "Warfarin"]
}

response = requests.post(url, json=data)
print(response.json())
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black .
flake8 .
```

### Type Checking

```bash
mypy .
```

## Deployment

### Docker (Coming Soon)

```bash
docker build -t quickmedi-ai .
docker run -p 8000:8000 quickmedi-ai
```

### Production Considerations

1. Set `DEBUG=false` in production
2. Use specific CORS origins instead of `["*"]`
3. Implement proper authentication and authorization
4. Use a production database (PostgreSQL)
5. Set up Redis for caching
6. Configure proper logging and monitoring
7. Use environment-specific configuration files

## Security

- Never commit `.env` file with real API keys
- Use HTTPS in production
- Implement rate limiting
- Validate all user inputs
- Sanitize file uploads
- Use secure session management

## Medical Disclaimer

This application is for educational and informational purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.

## Contributors

- QuickMedi Development Team

## Acknowledgments

- Google Gemini AI
- FastAPI
- Tesseract OCR
