from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User as UserModel
from schemas import UserCreate, UserUpdate, UserResponse
from utils.authentication import get_current_user, create_access_token
router = APIRouter()

@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    """Get all users from database"""
    users = db.query(UserModel).all()
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    db_user = UserModel(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update a user"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    db.delete(db_user)
    db.commit()
    return None


@router.post("/login")
def login(Email: str, password: str, db: Session = Depends(get_db)):
    """Login a user"""
    # This is a placeholder for login functionality
    # In a real application, you would verify the user's credentials and return a token or session
    user = db.query(UserModel).filter(UserModel.email == Email, UserModel.password == password).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {Email} not found"
        )
    else:
        access_token = create_access_token(data={"sub": user.name,"id": user.id, "email": user.email})
        return {"message": "Login Successful",
                "access_token": access_token,
                 "token_type": "bearer",
                 "user": {"id": user.id, "name": user.name, "email": user.email}}

@router.post("/signup")
def signup(name: str, email: str, password: str, db: Session = Depends(get_db)):
    """Signup a new user"""
    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = UserModel(name=name, email=email, password=password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "message": f"User {name} signed up successfully", "user_id": new_user.id}



@router.get(".protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    """A protected route that requires authentication"""
    return {"message": f"Hello, {current_user['email']}! This is a protected route."}