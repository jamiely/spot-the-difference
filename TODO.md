* Take the template, and show a copy of it side by side.
* Randomly remove several items from each copy. Keep track of what has been removed. These are the "differences".
* During play, the user will click on each image. If the user clicks within some threshold (30px) of the center of a "difference", indicate a hit there by marking with green '✔︎'. 
  * Place the X at the center of the difference.
* Once the user finds all the differences, the game should end.
* If the '!' key is pressed, reveal all the differences by placing a gray '◌' there.
* Accept a `?seed=<value>` in the query string, which will be used to seed the random number generator. If the same seed is given, the same differences should appear across game loads. The seed should also be used for sprite placement.
* The trash can doesn't work. It seems like we cannot drag sprites to it. Verify yourself and fix it.
* 