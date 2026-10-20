import os
import json
import asyncio
import logging
import threading
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from kafka import KafkaConsumer, KafkaProducer
import httpx

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# אפליקציית FastAPI
app = FastAPI(title="Unit 1 - API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# 📌 מנהל WebSocket יחיד ואמיתי
# ---------------------------------------------------
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"🟢 WebSocket connected ({len(self.active_connections)} total)")

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"🔴 WebSocket disconnected ({len(self.active_connections)} total)")

    async def broadcast(self, message: Dict[str, Any]):
        for ws in self.active_connections[:]:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(ws)


ws_manager = WebSocketManager()


#  Kafka Producer + Consumer
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
STORAGE_SERVICE_URL = os.getenv("STORAGE_SERVICE_URL", "http://unit3-storage:8003")

try:
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    logger.info("🟢 Kafka Producer connected")
except Exception as e:
    logger.error(f"❌ Kafka Producer Error: {e}")
    producer = None


def kafka_consumer_listener():
    """Thread: listens to processed-news and forwards it to WebSocket clients"""
    try:
        consumer = KafkaConsumer(
            "processed-news",
            bootstrap_servers=KAFKA_BROKER,
            auto_offset_reset="latest",
            group_id="api-gateway-group",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )
        logger.info("🟢 Kafka Consumer started")

        loop = asyncio.get_event_loop()

        for msg in consumer:
            news = msg.value
            logger.info(f"📨 Kafka got news: {news.get('id')}")

            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast(news),
                loop
            )

    except Exception as e:
        logger.error(f"❌ Kafka consumer thread error: {e}")


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Unit 1 API Gateway starting...")
    threading.Thread(target=kafka_consumer_listener, daemon=True).start()
    logger.info("🟢 Kafka consumer thread launched")


# ---------------------------------------------------
# 📌 REST endpoints
# ---------------------------------------------------
@app.get("/")
def root():
    return {"service": "Unit1", "status": "running"}


@app.get("/api/items/recent")
async def get_recent_items():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{STORAGE_SERVICE_URL}/storage/articles/recent")
            res.raise_for_status()
            return res.json()
    except Exception as e:
        return {"data": [], "error": str(e)}


@app.get("/api/articles/{article_id}")
async def get_article(article_id: str):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{STORAGE_SERVICE_URL}/storage/articles/{article_id}")
            res.raise_for_status()
            return res.json()
    except:
        raise HTTPException(status_code=404, detail="Not found")
    
@app.post("/api/news/fetch")
async def fetch_news():
    """Fetch news from NewsData API and send to Kafka"""
    
    if not producer:
        raise HTTPException(status_code=500, detail="Kafka Producer not available")
    
    NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY", "")
    if not NEWSDATA_API_KEY:
        raise HTTPException(status_code=500, detail="NEWSDATA_API_KEY missing")
    
    NEWS_API_URL = "https://newsdata.io/api/1/news"
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
            logger.info(f"📤 Sent article to Kafka: {article_data['title'][:50]}")
            sent_count += 1
        except Exception as e:
            logger.error(f"❌ Failed to send to Kafka: {e}")
    
    producer.flush()
    return {"message": f"Sent {sent_count} articles for processing"}


# @app.get("/proxy")
# def proxy(url: str = Query(..., description="URL to fetch")):
    try:
        # מביאים את תוכן האתר המקורי
        r = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0"
        })
        html = r.text

        # מנקים HTML כדי למנוע XSS
        soup = BeautifulSoup(html, "html.parser")

        # מסירים תגיות מסוכנות או כאלה שיחסמו iframe
        for tag in soup(["script", "style", "noscript", "iframe"]):
            tag.decompose()

        cleaned_html = str(soup)

        # מחזירים HTML שמותר להציג בתוך iframe
        return Response(
            content=cleaned_html,
            media_type="text/html",
            headers={
                "Access-Control-Allow-Origin": "*",
                "X-Frame-Options": "ALLOWALL",
                "Content-Security-Policy": "frame-ancestors *"
            }
        )

    except Exception as e:
        return {"error": str(e)}
# ---------------------------------------------------
# 📌 WebSocket endpoint היחיד והאמיתי
# ---------------------------------------------------
@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()   # keep alive
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"❌ WS error: {e}")
        await ws_manager.disconnect(websocket)
