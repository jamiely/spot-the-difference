## Playwright tests to add

### User can play the game (Spot-the-Difference Mode)

* **Game initialization**
  * Navigate to http://localhost:3000/
  * Verify "Start Game" button is visible
  * Click "Start Game" button
  * Confirm game loads with dual-side layout (left and right game boards)
  * Verify background images load on both sides (template1 background)
  * Verify sprites appear on both sides with some missing from right side
  * Verify score display shows "Differences Found: 0"

* **Difference detection functionality**
  * Click on a location where a sprite exists on left but not right side
  * Verify green checkmark appears on both sides at the clicked location
  * Verify score counter increments to "Differences Found: 1"
  * Click on same difference again - verify no additional score increment
  * Click on area with no difference - verify no visual feedback

* **Game completion**
  * Find and click all differences (typically 3-7 differences)
  * Verify each difference shows green checkmark on both sides
  * Verify score increments correctly for each found difference
  * Verify alert/completion message appears when all differences found
  * Verify game becomes inactive after completion

* **Reveal all differences feature**
  * Start a new game
  * Press "!" key while game is active
  * Verify gray circle markers appear on all unfound differences
  * Verify both found and unfound differences are visually distinct

### User can load a specific background via debug menu

* **Debug menu access**
  * Navigate to http://localhost:3000/ and start game
  * Press "?" key
  * Verify debug menu modal appears with title "Debug Menu"
  * Verify background dropdown is populated with available backgrounds
  * Verify "Load" button is present

* **Background loading**
  * Select "classroom.png" from background dropdown
  * Click "Load" button
  * Verify debug menu closes automatically
  * Verify new background image loads on both left and right sides
  * Verify sprites are randomly placed on the new background
  * Verify differences are generated (some sprites missing from right side)

* **Game functionality with loaded background**
  * Click on differences on the newly loaded background
  * Verify green checkmarks appear and score increments
  * Verify game completion works with custom background
  * Test with multiple different backgrounds (office.png, park.png, etc.)

### User can create and edit bounding boxes

* **Edit mode activation**
  * Navigate to http://localhost:3000/ and start game
  * Press "e" key
  * Verify edit mode overlay appears
  * Verify "Edit Mode" header is visible
  * Verify "Bounding Boxes JSON" textarea contains existing bounding box data
  * Verify drawing instructions are shown

* **Bounding box creation**
  * Click and drag on background image to create new bounding box
  * Verify visual rectangle appears during drag operation
  * Release mouse to complete bounding box
  * Verify new bounding box appears in "Bounding Boxes JSON" textarea
  * Verify JSON is properly formatted with id, x, y, width, height properties

* **Multiple bounding boxes**
  * Create 2-3 additional bounding boxes in different areas
  * Verify each appears in JSON textarea as separate objects
  * Verify boxes don't overlap or interfere with each other
  * Press "Escape" to exit edit mode
  * Verify edit mode overlay disappears

### User can place and manipulate sprites

* **Placement mode activation**
  * Navigate to http://localhost:3000/ and start game
  * Press "p" key
  * Verify placement mode interface appears
  * Verify "Placement Mode" header is visible
  * Verify "Sprite Positions JSON" textarea is present
  * Verify control buttons are available

* **Template loading in placement mode**
  * Select "template1" from template dropdown
  * Click "Load" button next to template selector
  * Verify background image changes to template1 background
  * Verify sprites appear positioned according to template coordinates
  * Verify "Sprite Positions JSON" textarea populates with sprite data

* **Sprite dragging and positioning**
  * Click and drag a sprite to a new position
  * Verify sprite moves smoothly during drag
  * Verify "Selected Sprite Position" updates with new coordinates
  * Verify "Sprite Positions JSON" updates immediately with new position
  * Test dragging multiple different sprites

* **Sprite management controls**
  * Click "Place all sprites" button
  * Verify additional sprites appear if not already present
  * Verify all sprites become draggable
  * Click "Move sprites outside" button
  * Verify sprites move outside background image boundaries
  * Verify JSON coordinates update to reflect outside positions

* **Mode transitions**
  * Press "Escape" to exit placement mode
  * Verify placement mode interface disappears
  * Verify game returns to previous state
  * Test transitioning between edit mode ("e") and placement mode ("p")

### User can manage templates and backgrounds

* **Background selection in placement mode**
  * Enter placement mode with "p" key
  * Select different backgrounds from dropdown (classroom.png, office.png, etc.)
  * Click "Load" button for background
  * Verify background changes without affecting sprite positions
  * Test with multiple background switches

* **Template management**
  * In placement mode, load different templates
  * Verify each template loads correct background and sprite positions
  * Test template switching between template1 and other available templates
  * Verify template data appears correctly in JSON textarea

### Error handling and edge cases

* **Invalid user interactions**
  * Try clicking outside background image boundaries
  * Verify no errors or unexpected behavior
  * Test rapid clicking on differences
  * Test keyboard shortcuts in wrong modes

* **Mode conflicts**
  * Try entering edit mode while in placement mode
  * Verify proper mode switching behavior
  * Test pressing multiple mode keys rapidly
  * Verify only one mode active at a time

* **Data persistence**
  * Create bounding boxes in edit mode
  * Switch to placement mode and back
  * Verify bounding boxes are preserved
  * Test sprite position persistence across mode switches

### Cross-browser and responsive testing

* **Mobile responsiveness**
  * Test touch interactions for sprite dragging
  * Verify game works on tablet/mobile screen sizes
  * Test touch-based difference detection

### Performance and stress testing

* **Rapid interactions**
  * Quickly find multiple differences in succession
  * Rapidly switch between modes
  * Test performance with multiple background switches
