* When completing a level, instead of using an alert box, use some non-alert modal.
* When moving to the next level, ensure all sprites from the previous level are removed.
* When placing sprites randomly, the sprite must not cause another sprite to be obscured by more than 70% of its area. This means that two sprites covering a third sprite may not cover more than 70% of that sprite.
* When placing sprites randomly, the center of the sprite may not be outside the bounds of the background.
* When placing sprites randomly, stop placing them if they take up more than 60% of the area of the background image.