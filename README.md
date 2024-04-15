# WebTetris

This is the long-awaited sequel to [*Quadtris*](https://github.com/AlexWills37/Tetris-Clone), a Tetris clone originally built in Python!

This implementation uses JavaScript and WebGL to recreate Tetris on a browser.

## Supported devices

As a static website, this project is supported on any device with a JavaScript-enabled browser. That being said, this game is currently incompatible with mobile, as a keyboard and mouse are needed to play the game.

In the future, mobile support and mobile-friendly controls will be added.

## How to play

To play the game, start by [opening the website here](https://alexwills37.github.io/WebTetris/).

The goal is to move and rotate the falling blocks to fill up the grid's rows. When a row is filled, it will be cleared, giving you points and making room for more blocks!

The game ends when the blocks reach the top of the grid.

### Controls

**Move the falling blocks left/right** - [A] and [D]

**Rotate the falling blocks clockwise** - [L] or [Right Arrow Key]

**Rotate the falling blocks counter-clockwise** - [J] or [Left Arrow Key]

**Hold a piece** - [E]

> You can hold onto one piece at a time if you want to save it for later.

**Move the falling block down faster** - [S]

**Hard drop** - [W]

> This quickly moves the piece to the bottom, as far as it can go. Be careful, you won't be able to move the piece any more after doing this!

**Pause game** - [Escape]

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

## Future Goals

Below are some features planned for development:

- [ ] Save user's top scores
- [ ] Allow custom controls
- [ ] Mobile controls + full support
- [ ] Better visuals
