import pygame
import sys
import random
import math

# Initialize pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600
GRID_SIZE = 20
GRID_WIDTH = WIDTH // GRID_SIZE
GRID_HEIGHT = HEIGHT // GRID_SIZE

# Colors
BACKGROUND = (15, 20, 25)
GRID_COLOR = (30, 35, 40)
SNAKE_HEAD = (50, 230, 150)
SNAKE_BODY = (40, 180, 120)
FOOD_COLOR = (220, 60, 60)
TEXT_COLOR = (220, 220, 220)
GAME_OVER_BG = (0, 0, 0, 180)

# Game settings
FPS = 10
SPEED_INCREASE = 0.5  # Speed increase per food eaten

# Create the screen
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Snake Game")
clock = pygame.time.Clock()

# Font setup
font = pygame.font.SysFont(None, 36)
big_font = pygame.font.SysFont(None, 72)

class Snake:
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.length = 3
        self.positions = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
        self.direction = random.choice([(0, 1), (0, -1), (1, 0), (-1, 0)])
        self.score = 0
        self.grow_to = 3
        self.speed = FPS
        
    def get_head_position(self):
        return self.positions[0]
    
    def update(self):
        head = self.get_head_position()
        x, y = self.direction
        new_position = (((head[0] + x) % GRID_WIDTH), ((head[1] + y) % GRID_HEIGHT))
        
        if new_position in self.positions[1:]:
            return False  # Game over
        
        self.positions.insert(0, new_position)
        
        if len(self.positions) > self.grow_to:
            self.positions.pop()
            
        return True  # Game continues
    
    def grow(self):
        self.grow_to += 1
        self.score += 10
        self.speed += SPEED_INCREASE
        
    def change_direction(self, direction):
        # Prevent 180-degree turns
        if (direction[0] * -1, direction[1] * -1) != self.direction:
            self.direction = direction
    
    def draw(self, surface):
        for i, pos in enumerate(self.positions):
            color = SNAKE_HEAD if i == 0 else SNAKE_BODY
            rect = pygame.Rect(pos[0] * GRID_SIZE, pos[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
            
            # Draw rounded rectangle for snake segments
            pygame.draw.rect(surface, color, rect, border_radius=8)
            
            # Draw eyes on the head
            if i == 0:
                # Determine eye positions based on direction
                eye_size = GRID_SIZE // 5
                if self.direction == (1, 0):  # Right
                    left_eye = (rect.right - GRID_SIZE//3, rect.top + GRID_SIZE//3)
                    right_eye = (rect.right - GRID_SIZE//3, rect.bottom - GRID_SIZE//3)
                elif self.direction == (-1, 0):  # Left
                    left_eye = (rect.left + GRID_SIZE//3, rect.top + GRID_SIZE//3)
                    right_eye = (rect.left + GRID_SIZE//3, rect.bottom - GRID_SIZE//3)
                elif self.direction == (0, 1):  # Down
                    left_eye = (rect.left + GRID_SIZE//3, rect.bottom - GRID_SIZE//3)
                    right_eye = (rect.right - GRID_SIZE//3, rect.bottom - GRID_SIZE//3)
                else:  # Up
                    left_eye = (rect.left + GRID_SIZE//3, rect.top + GRID_SIZE//3)
                    right_eye = (rect.right - GRID_SIZE//3, rect.top + GRID_SIZE//3)
                
                pygame.draw.circle(surface, (0, 0, 0), left_eye, eye_size)
                pygame.draw.circle(surface, (0, 0, 0), right_eye, eye_size)

class Food:
    def __init__(self):
        self.position = (0, 0)
        self.randomize_position()
        
    def randomize_position(self):
        self.position = (random.randint(0, GRID_WIDTH - 1), 
                         random.randint(0, GRID_HEIGHT - 1))
    
    def draw(self, surface):
        rect = pygame.Rect(self.position[0] * GRID_SIZE, 
                          self.position[1] * GRID_SIZE, 
                          GRID_SIZE, GRID_SIZE)
        
        # Draw apple-like food
        pygame.draw.circle(surface, FOOD_COLOR, rect.center, GRID_SIZE//2 - 2)
        
        # Draw stem
        stem_rect = pygame.Rect(0, 0, GRID_SIZE//6, GRID_SIZE//3)
        stem_rect.midtop = rect.midtop
        pygame.draw.rect(surface, (50, 120, 50), stem_rect, border_radius=2)
        
        # Draw leaf
        leaf_points = [
            (rect.centerx, rect.top + GRID_SIZE//4),
            (rect.centerx + GRID_SIZE//4, rect.top),
            (rect.centerx + GRID_SIZE//6, rect.top + GRID_SIZE//6)
        ]
        pygame.draw.polygon(surface, (100, 200, 100), leaf_points)

def draw_grid(surface):
    for y in range(0, HEIGHT, GRID_SIZE):
        for x in range(0, WIDTH, GRID_SIZE):
            rect = pygame.Rect(x, y, GRID_SIZE, GRID_SIZE)
            pygame.draw.rect(surface, GRID_COLOR, rect, 1)

def draw_score(surface, score, speed):
    score_text = font.render(f"Score: {score}", True, TEXT_COLOR)
    speed_text = font.render(f"Speed: {speed:.1f}", True, TEXT_COLOR)
    surface.blit(score_text, (10, 10))
    surface.blit(speed_text, (10, 50))

def draw_game_over(surface, score):
    # Semi-transparent overlay
    overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    overlay.fill(GAME_OVER_BG)
    surface.blit(overlay, (0, 0))
    
    # Game over text
    game_over_text = big_font.render("GAME OVER", True, (220, 60, 60))
    score_text = font.render(f"Final Score: {score}", True, TEXT_COLOR)
    restart_text = font.render("Press SPACE to play again", True, TEXT_COLOR)
    
    surface.blit(game_over_text, (WIDTH//2 - game_over_text.get_width()//2, HEIGHT//2 - 60))
    surface.blit(score_text, (WIDTH//2 - score_text.get_width()//2, HEIGHT//2 + 20))
    surface.blit(restart_text, (WIDTH//2 - restart_text.get_width()//2, HEIGHT//2 + 70))

def main():
    snake = Snake()
    food = Food()
    game_over = False
    
    # Main game loop
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            
            if event.type == pygame.KEYDOWN:
                if game_over and event.key == pygame.K_SPACE:
                    snake.reset()
                    food.randomize_position()
                    game_over = False
                elif not game_over:
                    if event.key == pygame.K_UP:
                        snake.change_direction((0, -1))
                    elif event.key == pygame.K_DOWN:
                        snake.change_direction((0, 1))
                    elif event.key == pygame.K_LEFT:
                        snake.change_direction((-1, 0))
                    elif event.key == pygame.K_RIGHT:
                        snake.change_direction((1, 0))
        
        if not game_over:
            # Update snake position
            if not snake.update():
                game_over = True
            
            # Check if snake ate food
            if snake.get_head_position() == food.position:
                snake.grow()
                food.randomize_position()
                # Make sure food doesn't appear on snake
                while food.position in snake.positions:
                    food.randomize_position()
        
        # Drawing
        screen.fill(BACKGROUND)
        draw_grid(screen)
        snake.draw(screen)
        food.draw(screen)
        draw_score(screen, snake.score, snake.speed)
        
        if game_over:
            draw_game_over(screen, snake.score)
        
        pygame.display.flip()
        clock.tick(snake.speed)

if __name__ == "__main__":
    main()