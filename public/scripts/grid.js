
// Controls the pixel scale of the exported image (higher values result in higher resolution images)
const IMAGE_EXPORT_SCALE = 4;

export class Grid {
    constructor(id, width = 10, height = 10) {
        this.container = document.getElementById(id);
        this.data = Array.from({ length: height }, () => Array(width).fill(''));
        this.draw();
    }

    width = () => this.data[0].length;
    height = () => this.data.length;

    cellAt = (row, col) => this.container.children[row * this.width() + col];

    entryAt(row, col) {
        const entry = this.data[row][col];
        if (entry.length !== 1 || entry === '#') {
            return "_";
        } else {
            return entry;
        }
    }

    updateEntryAt(row, col, value) {
        const cell = this.cellAt(row, col);

        // Mark as empty
        cell.classList.toggle('empty', value === '#');

        // Mark as hint
        cell.classList.toggle('hint', value.length > 1 || cell.children.length !== 0);

        // Update the cell text content if it has changed (e.g. if loaded from a file)
        if (cell.textContent !== value) {
            cell.textContent = value;
        }

        // Handle cell arrows
        const directions = ['arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
            'arrow-up-right', 'arrow-up-left', 'arrow-down-right', 'arrow-down-left',
            'arrow-right-up', 'arrow-right-down', 'arrow-left-up', 'arrow-left-down'
        ];
        if (directions.includes(value)) {
            cell.classList.add('arrow');
            cell.setAttribute('direction', value);
        } else {
            cell.classList.remove('arrow');
            cell.removeAttribute('direction');
        }

        // Handle cell splitting
        if (cell.children.length === 0) {
            // Check if the cell contains a pipe character; if so, split the cell into upper/lower cells
            if (value.includes('|')) {

                // Replace the cell with the upper/lower cells
                cell.innerHTML = '';
                cell.contentEditable = false;
                cell.appendChild(document.createElement('div'));
                cell.appendChild(document.createElement('div'));

                // Extract the text for the first and second elements
                const index_of_split = value.indexOf('|');
                const upperText = value.substring(0, index_of_split);
                const lowerText = value.substring(index_of_split + 1, value.length);

                // Fill the upper and lower cells with the extracted text
                if (upperText) {
                    cell.children[0].textContent = upperText;
                }
                if (lowerText) {
                    cell.children[1].textContent = lowerText;
                }
                cell.children[0].contentEditable = true;
                cell.children[1].contentEditable = true;
                cell.children[1].focus();
            }
        }
        else if (cell.children.length === 1) {
            // Convert cell to a single cell again
            cell.innerHTML = value;
            cell.contentEditable = true;
            cell.focus();
        }
        else if (cell.children.length === 2) {
            // Format value as upper/lower cells
            value = cell.children[0].textContent + '|' + cell.children[1].textContent;
        }

        // Update the data array with the new value
        this.data[row][col] = value;
    }

    draw() {
        this.container.innerHTML = '';

        this.container.style.gridTemplateColumns = `repeat(${this.width()}, 1fr)`;
        this.container.style.gridTemplateRows = `repeat(${this.height()}, 1fr)`;

        this.data.forEach((elements, row) => {
            elements.forEach((value, col) => {
                this.drawCell(row, col, value);
            });
        });

        this.notifyChanges();
    }

    drawCell(row, col, value = '') {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.contentEditable = true;

        // Update entry on change 
        cell.addEventListener('input', () => {
            this.updateEntryAt(row, col, cell.textContent);
            this.clearHighlights();
            this.notifyChanges();
        });

        // Arrow key navigation
        cell.addEventListener('keydown', (event) => {
            this.clearHighlights();

            // Enable deleting cell content with delete or backspace keys
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (cell.children.length === 0) {
                    // If the cell contains a single character; delete the character.
                    // Note: Erasing the cell content changes the cell to an empty cell, so we need to notify changes.
                    if (cell.textContent.length === 1) {
                        this.updateEntryAt(row, col, '');
                        this.notifyChanges();
                        event.preventDefault(); // Prevents the default behavior of the Delete/Backspace key which would otherwise delete another character.
                        return;
                    }
                }
                else if (cell.children.length > 1) {
                    // If the cell contains upper/lower cells; delete the selected cell and focus on the remaining one. 
                    // Note: The remaining cell should still be a hint, so we don't need to notify changes.
                    const activeChild = document.activeElement;
                    if (activeChild.textContent === '') {
                        activeChild.remove();
                        this.updateEntryAt(row, col, cell.textContent);
                        event.preventDefault(); // Prevents the default behavior of the Delete/Backspace key which would potentially delete another character or an entire div.
                        return;
                    }
                }
            }

            // Prevents the default behavior of the Enter key. In some cases this would otherwise create nested <div> elements.
            if (event.key === 'Enter') {
                event.preventDefault();
                return;
            }

            // Navigate through the upper/lower cells
            if (cell.children.length > 0) {
                const activeChild = document.activeElement;
                if (event.key === 'ArrowUp') {
                    for (let i = 1; i < cell.children.length; i++) {
                        if (activeChild === cell.children[i]) {
                            cell.children[i - 1].focus();
                            event.preventDefault();
                            return;
                        }
                    }
                }
                if (event.key === 'ArrowDown') {
                    for (let i = 0; i < cell.children.length - 1; i++) {
                        if (activeChild === cell.children[i]) {
                            cell.children[i + 1].focus();
                            event.preventDefault();
                            return;
                        }
                    }
                }
            }

            // Go to the next cell based on the arrow key pressed
            let nextIndex;
            switch (event.key) {
                case 'ArrowUp':
                    nextIndex = (row - 1) * this.width() + col;
                    break;
                case 'ArrowDown':
                    nextIndex = (row + 1) * this.width() + col;
                    break;
                case 'ArrowLeft':
                    nextIndex = row * this.width() + col - 1;
                    break;
                case 'ArrowRight':
                    nextIndex = row * this.width() + col + 1;
                    break;
                default:
                    return;
            }

            // This prevents the cursor from moving around ilogically when using arrow keys
            event.preventDefault();

            // Check if the next cell is within the grid bounds
            if (nextIndex < 0 || nextIndex >= this.container.children.length) {
                return;
            }

            const nextCell = this.container.children[nextIndex];
            if (nextCell.children.length === 0) {
                // Focus on the next cell
                nextCell.focus();
            } else if (event.key === 'ArrowUp') {
                // Focus on the last child (when entering from ArrowUp)
                nextCell.children[nextCell.children.length - 1].focus();
            } else {
                // Focus on the first child (whene entering from: ArrowDown, ArrowLeft, ArrowRight)
                nextCell.children[0].focus();
            }

            // Holding shift key while moving with arrow keys will start selection
            if (event.shiftKey) {
                if (!this.isSelecting) {
                    this.selectionStart(row, col);
                }
                const nextRow = Math.floor(nextIndex / this.width());
                const nextCol = nextIndex % this.width();
                this.selectionUpdate(nextRow, nextCol);
            }
        });

        cell.addEventListener('keyup', (event) => {
            if (event.key === 'Shift') {
                this.selectionStop(row, col);
            }
        });

        // Start cell selection on left mouse down
        cell.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                this.selectionStart(row, col);
            }
        });

        // End cell selection on left mouse up
        cell.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.selectionStop(row, col);
            }
        });

        // Update cell selection on mouse enter
        cell.addEventListener('mouseenter', () => {
            if (this.isSelecting) {
                this.selectionUpdate(row, col);
            }
        });

        // Disable default selection behavior to allow cell selection
        cell.addEventListener('dragstart', (event) => {
            event.preventDefault();
        });

        // Append the cell to the grid container and trigger an update
        this.container.appendChild(cell);
        this.updateEntryAt(row, col, value);
    }

    addRow() {
        this.data.push(Array(this.width()).fill(''));
        this.draw();
    }

    addColumn() {
        this.data.forEach(row => row.push(''));
        this.draw();
    }

    removeRow() {
        if (this.height() > 1) {
            this.data.pop();
            this.draw();
        }
    }

    removeColumn() {
        if (this.width() > 1) {
            this.data.forEach(row => row.pop());
            this.draw();
        }
    }

    shiftLeft() {
        this.data.forEach(row => row.push(row.shift()));
        this.draw();
    }

    shiftRight() {
        this.data.forEach(row => row.unshift(row.pop()));
        this.draw();
    }

    shiftUp() {
        this.data.push(this.data.shift());
        this.draw();
    }

    shiftDown() {
        this.data.unshift(this.data.pop());
        this.draw();
    }

    clearHighlights() {
        console.log('Clearing grid highlights');
        for (let i = 0; i < this.container.children.length; i++) {
            this.container.children[i].classList.remove('highlight-selected');
        }
    }

    onChanges(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        if (!this.callbacks) this.callbacks = [];
        this.callbacks.push(callback);
    }

    notifyChanges() {
        if (!this.callbacks) return;
        for (let i = 0; i < this.callbacks.length; i++) {
            this.callbacks[i]();
        }
    }

    onSelected(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        if (!this.selectedCallbacks) this.selectedCallbacks = [];
        this.selectedCallbacks.push(callback);
    }

    notifySelected(selectedWord) {
        if (!this.selectedCallbacks) return;
        for (let i = 0; i < this.selectedCallbacks.length; i++) {
            this.selectedCallbacks[i](selectedWord);
        }
    }

    selectionStart(row, col) {
        // console.log('Starting cell selection (row:', row, 'col:', col, ')');
        this.isSelecting = true;
        this.selectingFromCell = { row, col };
        this.selectingToCell = { row, col };
        this.selectedCells = [];
        this.clearHighlights();
    }

    selectionUpdate(row, col) {
        // Return if not selecting
        if (!this.isSelecting) return;

        this.selectingToCell = { row, col };

        // Update selected cells (either horizontally or vertically)
        this.selectedCells = [];
        if (Math.abs(this.selectingFromCell.row - this.selectingToCell.row) > Math.abs(this.selectingFromCell.col - this.selectingToCell.col)) {
            const fromRow = Math.min(this.selectingFromCell.row, this.selectingToCell.row);
            const toRow = Math.max(this.selectingFromCell.row, this.selectingToCell.row);
            for (let i = fromRow; i <= toRow; i++) {
                this.selectedCells.push({ row: i, col: this.selectingFromCell.col });
            }
        } else {
            const fromCol = Math.min(this.selectingFromCell.col, this.selectingToCell.col);
            const toCol = Math.max(this.selectingFromCell.col, this.selectingToCell.col);
            for (let i = fromCol; i <= toCol; i++) {
                this.selectedCells.push({ row: this.selectingFromCell.row, col: i });
            }
        }

        // Update which cells are highlighted
        this.clearHighlights();
        if (this.selectedCells.length > 1) {
            for (let i = 0; i < this.selectedCells.length; i++) {
                this.cellAt(this.selectedCells[i].row, this.selectedCells[i].col).classList.add('highlight-selected');
            }
        }
    }

    selectionStop(row, col) {
        // console.log('Stopping cell selection (row:', row, 'col:', col, ')');

        // Update selected cells
        this.selectionUpdate(row, col);

        // Notify selected cells
        if (this.selectedCells.length > 1) {
            let selectedWord = "";
            for (let i = 0; i < this.selectedCells.length; i++) {
                selectedWord += this.entryAt(this.selectedCells[i].row, this.selectedCells[i].col);
            }
            this.notifySelected(selectedWord);
        }

        // Reset dragging state
        this.isSelecting = false;
        this.selectingFromCell = null;
        this.selectingToCell = null;
        this.selectedCells = [];
    }

    async loadFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.draw();
        } catch (error) {
            console.error('Error loading grid data:', error);
        }
    }

    async saveFile(url) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.data)
            });
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
            const result = await response.text();
            alert(result);
        } catch (error) {
            console.error('Error saving grid:', error);
        }
    }

    async populateFileSelector(gridSelector) {
        try {
            const response = await fetch('/puzzle-options');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                gridSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading JSON file list:', error);
        }
    }

    async exportGridContainer() {
        html2canvas(this.container, {
            scale: IMAGE_EXPORT_SCALE,
            onclone: (cloneDoc) => {
                const clonedContainer = cloneDoc.getElementById('grid-container');

                // Style the container to fully display the grid
                clonedContainer.style.overflow = 'visible';
                clonedContainer.style.width = 'auto';
                clonedContainer.style.height = 'auto';
                clonedContainer.style.maxWidth = 'none';
                clonedContainer.style.maxHeight = 'none';

                // Post-process the cloned container
                for (let i = 0; i < clonedContainer.children.length; i++) {
                    // Removes classes starting with 'highlight' as they are only used for highlighting cells while working with the grid
                    for (let j = clonedContainer.children[i].classList.length - 1; j >= 0; j--) {
                        const className = clonedContainer.children[i].classList[j];
                        if (className.startsWith("highlight")) {
                            clonedContainer.children[i].classList.remove(className);
                        }
                    }

                    // Deletes cells that are neither hints nor empty
                    if (!(clonedContainer.children[i].classList.contains('hint') || clonedContainer.children[i].classList.contains('empty'))) {
                        clonedContainer.children[i].textContent = '';
                    }
                }
            }
        }).then(canvas => {
            const newTab = window.open();

            // Write an empty HTML document to the new tab
            newTab.document.open();
            newTab.document.write(`<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Exported Puzzle</title>
                </head>
                <body style="margin:0"></body>
            </html>`);

            // Append the canvas to the new tab's body
            newTab.document.body.append(canvas);

            newTab.document.close();
        });
    }
}