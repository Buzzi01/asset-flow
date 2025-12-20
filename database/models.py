from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

Base = declarative_base()

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    target_percent = Column(Float, default=0.0)
    assets = relationship("Asset", back_populates="category")

class Asset(Base):
    __tablename__ = 'assets'
    id = Column(Integer, primary_key=True)
    ticker = Column(String, unique=True, nullable=False)
    name = Column(String)
    currency = Column(String, default="BRL")
    category_id = Column(Integer, ForeignKey('categories.id'))
    category = relationship("Category", back_populates="assets")
    position = relationship("Position", uselist=False, back_populates="asset")
    market_data = relationship("MarketData", back_populates="asset")

class Position(Base):
    __tablename__ = 'positions'
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), unique=True)
    quantity = Column(Float, default=0.0)
    average_price = Column(Float, default=0.0)
    target_percent = Column(Float, default=0.0)
    manual_lpa = Column(Float, nullable=True)
    manual_vpa = Column(Float, nullable=True)
    manual_dy = Column(Float, nullable=True)
    asset = relationship("Asset", back_populates="position")

class MarketData(Base):
    __tablename__ = 'market_data'
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('assets.id'))
    date = Column(Date, default=datetime.now)
    price = Column(Float)
    min_6m = Column(Float)
    asset = relationship("Asset", back_populates="market_data")

# --- NOVO: TABELA DE HISTÓRICO ---
class PortfolioSnapshot(Base):
    __tablename__ = 'snapshots'
    
    id = Column(Integer, primary_key=True)
    date = Column(Date, default=datetime.now)
    total_equity = Column(Float)      # Patrimônio Total
    total_invested = Column(Float)    # Total Investido
    profit = Column(Float)            # Lucro Nominal
    
    # Podemos adicionar composição por categoria depois se quiser

engine = create_engine('sqlite:///assetflow.db', echo=False)
Session = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)