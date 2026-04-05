from database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

class User(Base):
    """User model for database"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True

class Document(Base):
    """Document model for database"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    faiss_index_path = Column(String(512), nullable=True)
    doc_title = Column(String(512), nullable=True)       # auto-generated title
    summary = Column(Text, nullable=True)                # 3-line summary
    key_topics = Column(Text, nullable=True)             # JSON list of 5 topics
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True

class Conversation(Base):
    """Conversation model for database"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    document_id = Column(Integer, nullable=False)
    conversation_history = Column(Text, nullable=False)  # Store as JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True
