FROM python:3.13.7-slim

WORKDIR /app

COPY ./requirements.txt /app/requirements.txt

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && pip install --upgrade -r /app/requirements.txt \
    && apt-get purge -y --auto-remove gcc

COPY . .

EXPOSE 8000

CMD ["fastapi", "dev", "./api/main.py", "--port", "8000"]