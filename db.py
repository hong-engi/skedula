import sqlite3
import pygame
import objects

def db_path(db_name):
    db_dir = "plans"
    return f"{db_dir}/{db_name}"

def append(db_name, obj):
    conn = sqlite3.connect(db_path(db_name))
    cursor = conn.cursor()
    cursor.execute("INSERT INTO plans (name, importance, color, tags) VALUES (?, ?, ?, ?)",
                   (obj.name, obj.importance, str(obj.color), ','.join(obj.tags) if obj.tags else None))
    conn.commit()
    
    obj.id = cursor.lastrowid

def update(db_name, obj):
    conn = sqlite3.connect(db_path(db_name))
    cursor = conn.cursor()
    cursor.execute("UPDATE plans SET name=?, importance=?, color=?, tags=? WHERE id=?",
                   (obj.name, obj.importance, str(obj.color), ','.join(obj.tags) if obj.tags else None, obj.id))
    conn.commit()

def create_db(db_name):
    conn = sqlite3.connect(db_path(db_name))
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, importance INTEGER, color TEXT, tags TEXT)")    
    conn.commit()

def delete(db_name, obj):
    conn = sqlite3.connect(db_path(db_name))
    cursor = conn.cursor()
    cursor.execute("DELETE FROM plans WHERE id=?", (obj.id,))
    conn.commit()
    
def load(db_name):
    conn = sqlite3.connect(db_path(db_name))
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS plans \
                   (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, importance INTEGER, color TEXT, tags TEXT)")    
    cursor.execute("SELECT * FROM plans")
    rows = cursor.fetchall()

    obj_list = []
    for row in rows:
        id, name, importance, color_str, tags = row
        color = pygame.Color(*map(int, color_str.strip('[]').split(',')))
        tags = tags.split(',') if tags else []
        obj_list.append(objects.Plan(name, importance, color, tags))
    return obj_list
