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


class UserPreference(Base):
    """Per-user response preferences for personalization."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True, nullable=False)
    response_tone = Column(String(64), default="balanced", nullable=False)
    response_length = Column(String(32), default="medium", nullable=False)
    language = Column(String(64), default="English", nullable=False)
    citation_style = Column(String(32), default="inline", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True


class UserMemory(Base):
    """Simple key-value memory items stored for each user."""
    __tablename__ = "user_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    memory_key = Column(String(128), nullable=False)
    memory_value = Column(Text, nullable=False)
    importance = Column(Integer, default=3, nullable=False)  # 1(low) - 5(high)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True
