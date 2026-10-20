import os
import json
import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException
from kafka import KafkaProducer
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Kafka Producer
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
try:
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        retries=5
    )
    print(f"✅ Kafka Producer connected to {KAFKA_BROKER}")
except Exception as e:
    print(f"❌ Kafka Producer failed: {e}")
    producer = None

# NewsData API
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY", "")
NEWS_API_URL = "https://newsdata.io/api/1/news"


@router.get("/")
def root():
    return {
        "service": "Unit 1 - API Gateway",
        "status": "running",
        "endpoints": ["/api/items/recent", "/api/articles/{id}", "/ws"]
    }


@router.post("/api/news/fetch")
async def fetch_news():
    """שולף חדשות מNewsData API ושולח ל-Kafka"""
    
    if not producer:
        raise HTTPException(status_code=500, detail="Kafka Producer לא זמין")
    
    if not NEWSDATA_API_KEY:
        raise HTTPException(status_code=500, detail="NEWSDATA_API_KEY חסר")
    
    params = {
        "apikey": NEWSDATA_API_KEY,
        "language": "en",
        "size": 10
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(NEWS_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch news: {e}")
    
    articles = data.get("results", [])
    sent_count = 0
    
    for article in articles:
        article_data = {
            "id": article.get("article_id") or article.get("link", ""),
            "title": article.get("title", ""),
            "description": article.get("description", ""),
            "content": article.get("content") or article.get("description", ""),
            "url": article.get("link", ""),
            "image": article.get("image_url"),
            "source": article.get("source_id", ""),
            "category": article.get("category", ["general"])[0] if isinstance(article.get("category"), list) else article.get("category", "general"),
            "pubDate": article.get("pubDate", "")
        }
        
        try:
            producer.send("raw-news", value=article_data)
            print(f"📤 Sent article to Kafka: {article_data['title'][:50]}")
            sent_count += 1
        except Exception as e:
            print(f"❌ Failed to send to Kafka: {e}")
    
    producer.flush()
    return {"message": f"Sent {sent_count} articles for processing"}


@router.get("/api/items/recent")
async def get_recent_items():
    """מחזיר חדשות אחרונות מ-Unit 3 (Storage)"""
    
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get("http://unit3-storage:8003/storage/articles/recent")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get articles from storage: {e}")


@router.get("/api/articles/{article_id}")
async def get_article_by_id(article_id: str):
    """מחזיר כתבה לפי ID מ-Unit 3 (Storage)"""
    
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"http://unit3-storage:8003/storage/articles/{article_id}")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Article not found: {e}")