# WebTetris

This is the long-awaited sequel to [*Quadtris*](https://github.com/AlexWills37/Tetris-Clone), a Tetris clone originally built in Python!

This implementation uses JavaScript and WebGL to recreate Tetris on a browser.

## Supported devices

As a static website, this project is supported on any device with a JavaScript-enabled browser. 

This game now supports mobile devices! There are 2 kinds of touchscreen-based input:
- On-screen buttons (like a game controller)
- Swipe gestures

By default, the swipe gestures are not enabled, but users can change that in the game's settings.
> I decided to disable swipe gestures by default because they are a bit difficult to use if it's your first time playing, and because the game doesn't have an interactive tutorial to help teach them.

## How to play

To play the game, start by [opening the website here](https://alexwills37.github.io/WebTetris/).

The goal is to move and rotate the falling blocks to fill up the grid's rows. When a row is filled, it will be cleared, giving you points and making room for more blocks!

The game ends when the blocks reach the top of the grid.

### Controls

> On the title screen, or when the game is paused, you can click "How to Play" for detailed information on the controls. Certain settings, like the sensitivities for swipe controls, can be changed in the settings menu.

> The listed key binds are the default keyboard controls. Any of the actions
> can be bound to different controls in the game's settings.

**Move the falling blocks left/right** - [A] and [D]

**Rotate the falling blocks clockwise** - [Right Arrow Key]

**Rotate the falling blocks counter-clockwise** - [Left Arrow Key]

**Hold a piece** - [E]

> You can hold onto one piece at a time if you want to save it for later.

**Move the falling block down faster** - [S]

**Hard drop** - [W]

> This quickly moves the piece to the bottom, as far as it can go. Be careful, you won't be able to move the piece any more after doing this!

**Pause game** - [Escape]

> This action cannot be bound to another key.

## Game development

The leading idea behind this game's development is that the game is best represented as a relatively small amount of data:

- 10x20 grid for playing
- List of pieces in the queue for the player
- Player's current piece
- Score

This data can then be passed into some rendering module to display the game. By separating the game and its visualization, changes are easier to implement, and everything is more organized.

After learning OpenGL, I was hoping to simply pass in the entire game state as a uniform buffer object and write a shader to do all of the visualization. Then I learned that WebGL uses GLSL `#version 100`, which is much more limited than I expected. How could I pass in the game's 10x20 grid state in a way that is somewhat efficient?

### Representing the game board

In the game module, the 10x20 grid is a list of 20 32-bit integers, where each integer is a row of blocks, represented by 3 bits each.

The integer

```
111 000 001 001 110 000 000 000 000 000 00
```

represents

```
  7   0   1   1   6   0   0   0   0   0  x
```

where each number is a block on the grid.

0 = empty space

1-7 = different colored blocks (corresponding to the 7 piece shapes).

In WebGL, shaders do not support bitwise integer operators, so I chose to convert this data into a texture for the shader.

The texture is 10x20, with each pixel representing a grid space. The color is simply the color the grid space should be, with black representing an empty grid space.

This approach allows us to translate between the 7 block types and their corresponding colors however we'd like in the rendering module. It also allows for using other colors, such as light grey for the piece's projected landing spot.

## Representing the piece previews

In the game, you can see the pieces that are coming up next, as well as any piece you are holding onto.

Instead of writing a shader with the shape of each piece or including textures for each piece, I made another texture to draw shapes to with the CPU.

The texture is 4x10, where each 4x2 rectangle fits one piece. The first piece is the held piece, and the next pieces are the first, second, third, and fourth pieces that are next in the player's queue.

## Centering the piece previews

Initially, the pieces were not all aligned in the preview. 
Most of the pieces are 3 blocks wide and 2 blocks tall, but the O piece is only 2 blocks wide, and the I piece is 4 blocks wide and 1 block tall.
Due to this, the O and I pieces were always out of line with the other pieces, and the initial decision was made to have the O and I pieces centered (think of the 4x10 texture upscaling into the piece preview), with the others 1 block to the left.

To align the pieces, I needed to send additional information to the shader, and luckily, there is a neat solution.

In all of the pieces (as they are drawn into a 4x2 rectangle), there is 1 pixel that is never used--the top right pixel.

```
    T    |    Z     |     S    |     L    |    J     |    O     |    I    
_________|__________|__________|__________|__________|__________|_________
X X X [] | X X   [] |   X X [] |     X [] | X     [] |   X X [] |       [] 
  X      |   X X    | X X      | X X X    | X X X    |   X X    | X X X X  
```

So I use this pixel to send alignment information.
For the 3-wide pieces, I color the pixel red. For the I piece, I color it green. 

Then in the fragment shader, if the piece's extra pixel is red, I move it half of a block to the right to center it horizontally,
and if the pixel is green (I-piece), I move it half of a block up to center it vertically.

Finally, I skip over drawing that pixel, keeping it the background color.


## Future Goals

Below are some features planned for development:

- [ ] Save user's top scores
- [x] Allow custom controls
- [x] Mobile controls + full support
- [ ] Better visuals
