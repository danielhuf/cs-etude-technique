FROM python:3.8-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && \
    git clone https://github.com/anouarac/travel-data-reader.git .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "decoratedRecoWriter.py"]
