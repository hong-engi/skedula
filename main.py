import pygame
import random
import threading
import time

import db,objects

from PyQt5.QtWidgets import QApplication, QInputDialog, QMessageBox

pygame.init()
app = QApplication([])

screen_width = 800
toolbar_width = 100
screen_height = 600
padding = 20
screen = pygame.display.set_mode((screen_width+toolbar_width, screen_height))
pygame.display.set_caption("Scedula Main")

white = (255, 255, 255)
blue = (0, 0, 255)
red = (255, 0, 0)

plan_list = db.load("plan1.db")

font1_path = "./fonts/BMDOHYEON_ttf.ttf"

def rgb_to_hsv(color:pygame.Color):
    color2 = pygame.Color(color.r,color.g,color.b)
    hsv = color2.hsva
    return hsv[0], hsv[1], hsv[2]

def hsv_to_rgb(color:pygame.Color):
    hsv = color.hsv
    color2 = pygame.Color(0, 0, 0, 0)
    color2.hsva = (hsv[0], hsv[1], hsv[2], 100) 
    return color2.r, color2.g, color2.b
def draw_rounded_rect(surface, color, rect, corner_radius, border_color=None, border_thickness=0):
    if color:
        pygame.draw.rect(surface, color, rect, border_radius=corner_radius)

    if border_color and border_thickness > 0:
        pygame.draw.rect(surface, border_color, rect, width=border_thickness, border_radius=corner_radius)


def bright(color, brightness = 1.5):
    hsv = color.hsva
    color2 = pygame.Color(0, 0, 0, 0)
    color2.hsva = (hsv[0], hsv[1], hsv[2]*brightness, 100) 
    return color2

def saturate(color, saturation = 1.5):
    hsv = color.hsva
    color2 = pygame.Color(0, 0, 0, 0)
    color2.hsva = (hsv[0], hsv[1]*saturation, hsv[2], 100) 
    return color2
def display_plan(screen, plan, ord):
    # Calculate plan dimensions and position
    plan_width = screen_width - padding * 2
    plan_height = screen_height / 6
    plan_pos = (padding, padding + ord * (plan_height + padding) - scroll)
    plan_rect = pygame.Rect(plan_pos, (plan_width, plan_height))
    
    mouse_pos = pygame.mouse.get_pos()
    is_hovered = plan_rect.collidepoint(mouse_pos)
    rect_color = plan.color if not is_hovered else bright(plan.color,0.7)

    draw_rounded_rect(screen, rect_color, plan_rect,
                      corner_radius=padding, border_color=(25, 25, 25), border_thickness=2)

    font = pygame.font.Font(font1_path, int(plan_height * 3 / 5))
    text_color = saturate(rect_color, 1.5)
    text_color = bright(text_color, 0.7)
    text_surface = font.render(plan.name, True, text_color)

    text_width, text_height = text_surface.get_size()
    text_pos = (plan_pos[0] + padding / 2, plan_pos[1] + (plan_rect.height - text_height) / 2 + 5)
    screen.blit(text_surface, text_pos)

    battery_width = plan_height / 4 
    battery_height = plan_height * 0.8
    battery_x = plan_pos[0] + plan_width - battery_width - padding  
    battery_y = plan_pos[1] + (plan_height - battery_height) / 2
    battery_rect = pygame.Rect(battery_x, battery_y, battery_width, battery_height)
    pygame.draw.rect(screen, (255,255,255), battery_rect, border_radius=int(padding / 4))

    num_segments = 5
    segment_height = battery_height / num_segments
    segment_padding = 2
    segment_width = battery_width-segment_padding*2

    for i in range(num_segments):
        segment_y = battery_y + i * segment_height
        segment_rect = pygame.Rect(battery_x+segment_padding, segment_y + segment_padding / 2,
                                   segment_width, segment_height - segment_padding)

        if num_segments - i <= plan.importance:
            if plan.importance == 1:
                segment_color = (205, 60, 60)
            if plan.importance == 2:
                segment_color = (205, 120, 60)
            if plan.importance == 3:
                segment_color = (205, 205, 60)
            if plan.importance == 4:
                segment_color = (120, 205, 60)
            if plan.importance == 5:
                segment_color = (60, 205, 60)
        else:
            segment_color = (200, 200, 200)

        pygame.draw.rect(screen, segment_color, segment_rect, border_radius=int(padding / 2))

    pygame.draw.rect(screen, (25, 25, 25), battery_rect, width=2, border_radius=int(padding / 4))



def display_plans(screen, plan_list):
    for ord, plan in enumerate(plan_list):
        display_plan(screen, plan, ord)


def display_text(screen, text, font, position, color):
    text_surface = font.render(text, True, color)
    screen.blit(text_surface, position)

def random_color():
    rgb = random.randint(0,2)
    color = []
    for i in range(3):
        if i == rgb:
            color.append(random.randint(200,255))
        else:
            color.append(random.randint(100,150))
    return color

def start_timer(fps):
    time.sleep(1/fps)

def threshold(v,minval,maxval,extra,alpha=0.95):
    if v<minval:
        v=max(v,minval-extra)
        return v+(minval-v)*(1-alpha)
    elif v>maxval:
        v=min(v,maxval+extra)
        return v+(maxval-v)*(1-alpha)
    else:
        return v
    
def get_input(request_string, format = "txt"):
    while True:
        text, ok = QInputDialog.getText(None, "", request_string)
        if ok:
            if format == "int":
                try:
                    return int(text)
                except ValueError:
                    error_dialog = QMessageBox()
                    error_dialog.setWindowTitle("오류")
                    error_dialog.setText("정수를 입력해주시기 바랍니다.")
                    # error_dialog.setStyleSheet("QLabel{min-width: 200px; font-size: 12pt;}") 
                    error_dialog.exec_()
                    continue
            else:
                return text
        return None

def add_plan():
    global plan_list
    input_text = get_input("계획의 이름을 입력해주세요")
    if not input_text:
        return
    importance = get_input("계획의 중요도를 입력해주세요", format = "int")
    if not importance:
        importance = 0

    new_plan = objects.Plan(name=input_text, color=[225,225,225], tags=[])
    new_plan.importance = importance
    new_plan.append("plan1.db")
    plan_list = db.load("plan1.db")

    done_dialog = QMessageBox()
    done_dialog.setWindowTitle("")
    done_dialog.setText(f"{input_text} 저장 완료.")
    done_dialog.exec_()

# Main game loop
plus_button = objects.Button(
    pos = (screen_width+toolbar_width-100,0),
    size = (100,100),
    color = (120,255,120),
    shape = "circle",
    image = "plus_button.png",
    # text = "+"
)
plus_button.func = add_plan

scroll = 0
scrolling = 0
fps = 60
running = True
importance = 0
importance_active = False
button_list = [plus_button]

while running:
    timer_thread = threading.Thread(target=start_timer, args = (fps,))
    timer_thread.start()
    screen.fill(white)
    display_plans(screen,plan_list)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                for button in button_list:
                    if button.rect.collidepoint(event.pos):
                        button.selected = True
            if event.button == 4:  # Scrolling up
                scrolling -= 0.5
            elif event.button == 5:  # Scrolling down
                scrolling += 0.5
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1:
                for button in button_list:
                    if button.rect.collidepoint(event.pos) and button.selected:
                        button.selected = False
                        button.func()
    
    for button in button_list:
        if button.rect.collidepoint(pygame.mouse.get_pos()):
            button.hovered = True
        else:
            button.hovered = False

    for button in button_list:
        button.blit(screen)


    more_space = 50
    height_end = max(0, len(plan_list)*(screen_height/6+padding)+padding - screen_height)
    scrolling = threshold(scrolling, 0, 0, 30, 0.9)
    scroll += scrolling
    scroll = threshold(scroll,0,height_end,more_space,0.75)

    pygame.draw.line(screen, 'black', (screen_width, 0), (screen_width,screen_height))

    pygame.display.flip()

    timer_thread.join()

pygame.quit()
