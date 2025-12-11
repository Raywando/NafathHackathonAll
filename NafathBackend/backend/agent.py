import os
from openai import OpenAI

def analyze_risk(request):
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    with open('prompt.txt', 'r') as f:
        prompt = f.read()

    response = client.responses.create(
        model="o3",
        input=[
            {
            "role": "developer",
            "content": [
                {
                "type": "input_text",
                "text": prompt
                }
            ]
            },
            {
            "role": "user",
            "content": [
                {
                "type": "input_text",
                "text": request
                }
            ]
            }
        ],
        text={
            "format": {
            "type": "text"
            }
        },
        reasoning={
            "effort": "medium"
        },
        tools=[],
        store=True,
        include=[
            # "reasoning.encrypted_content",
            # "web_search_call.action.sources"
        ]
    )

    return response.output[1].content[0].text