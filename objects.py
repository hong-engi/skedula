import db
import pygame
from typing import Any


class Plan:
    def __init__(
        self, 
        name:str, 
        importance:int=0, 
        color = pygame.Color(125,125,125), 
        tags:list[str]=[]
    ):
        self.id = None
        self.name = name
        self.importance = importance
        self.tags = tags

        self.color = color
        self.selected = True

    def append(self, db_name):
        db.append(db_name, self)

    def update(self, db_name):
        db.update(db_name, self)

class Button:
    def __init__(self, pos, size, shape:str="square", color = pygame.Color(125,125,125), image=None, text=None):
        self.pos = pos
        self.size = size
        self.rect = pygame.Rect(pos,size)
        self.shape = shape
        self.color = color
        load_image = pygame.image.load(f"images/{image}") if image else None
        self.image = pygame.transform.scale(load_image, self.size)
        self.text = text
        self.hovered = False
        self.selected = False
        self.func = lambda *args, **kwargs: None # Dummy function

    def rect_update(self):
        self.rect = pygame.Rect(self.pos, self.size)

    def move(self, x,y):
        self.pos = (x,y)

    def draw_text(self,screen, rect, text, font_size, text_font=None, text_color=pygame.Color(255, 255, 255)):
        if text_font is None:
            text_font = pygame.font.Font(None, font_size) 
        
        text_surface = text_font.render(text, True, text_color)
        text_rect = text_surface.get_rect()
        
        text_x = rect.x + (rect.width - text_rect.width) // 2
        text_y = rect.y + (rect.height - text_rect.height) // 2
        
        screen.blit(text_surface, (text_x, text_y))

    def blit(self, screen):
        draw_image = self.image
        if self.selected:
            pygame.draw.rect(screen, (255, 255, 150, 10), self.rect)
        if self.hovered:
            draw_image = pygame.transform.smoothscale(self.image, (int(self.image.get_width() * 1.1), int(self.image.get_height() * 1.1)))
        
        if self.image:
            screen.blit(draw_image, (self.pos[0] + (self.image.get_width() - draw_image.get_width()) // 2,
                                    self.pos[1] + (self.image.get_height() - draw_image.get_height()) // 2))
        elif self.shape == "square":
            pygame.draw.rect(screen, self.color, self.rect)
        else:
            pygame.draw.ellipse(screen, self.color, (self.pos, self.size))
        self.draw_text(screen,self.rect,self.text,self.size[0])