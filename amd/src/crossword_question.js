// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * CrosswordQuestion base class handle every common function.
 *
 * @module qtype_crossword/crossword_question
 * @copyright 2022 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export class CrosswordQuestion {

    // Arrow Left key.
    ARROW_LEFT = 'ArrowLeft';

    // Arrow Right key.
    ARROW_RIGHT = 'ArrowRight';

    // Arrow Up key.
    ARROW_UP = 'ArrowUp';

    // Arrow Down key.
    ARROW_DOWN = 'ArrowDown';

    // End key.
    END = 'End';

    // Home key.
    HOME = 'Home';

    // Delete key.
    DELETE = 'Delete';

    // Backspace key.
    BACKSPACE = 'Backspace';

    // Z key.
    Z_KEY = 'z';

    // A key.
    A_KEY = 'a';

    // Enter key.
    ENTER = 'Enter';

    // Maximum row of crossword.
    MAX_ROW = 30;

    /**
     * Constructor for crossword question.
     *
     * @param {Object} options The input options for the crossword.
     */
    constructor(options) {
        let defaultOption = {
            colsNum: 10,
            rowsNum: 10,
            words: [],
            target: '#crossword',
            isPreview: false,
            previewSetting: {backgroundColor: '#ffffff', borderColor: '#000000', textColor: '#ffffff', conflictColor: '#f4cece'},
            cellWidth: 31,
            cellHeight: 31,
            wordNumber: -1,
            coordinates: '',
            maxSizeCell: 50,
            minSizeCell: 30,
            specialCharacters: {
                hyphen: '-',
                space: ' ',
                straightsinglequote: '\'',
                openingsinglequote: '‘',
                closingsinglequote: '’',
            },
        };
        // Merge options.
        defaultOption = {...defaultOption, ...options};
        // Set options.
        this.options = defaultOption;
        // Get target element.
        const targetEls = document.querySelectorAll(defaultOption.target);
        for (let i = 0; i < targetEls.length; i++) {
            if (!targetEls[i].querySelector('svg')) {
                this.crosswordEl = targetEls[i];
                this.options.crosswordEl = targetEls[i];
                if (!this.options.isPreview) {
                    this.options.words = this.retrieveWordData();
                }
                break;
            }
        }
    }

    /**
     * Get word data.
     *
     * @return {Array} Word data list.
     */
    retrieveWordData() {
        const clueEls = this.options.crosswordEl
            .closest('.qtype_crossword-grid-wrapper')
            .querySelectorAll('.contain-clue .wrap-clue');
        if (clueEls.length === 0) {
            return [];
        }
        return [...clueEls].map(el => {
            const number = parseInt(el.dataset.questionid);
            const startRow = parseInt(el.dataset.startrow);
            const startColumn = parseInt(el.dataset.startcolumn);
            const length = parseInt(el.dataset.length);
            const orientation = parseInt(el.dataset.orientation);
            const clue = el.dataset.clue;
            const wordNumber = el.dataset.wordnumber;
            return {number, startRow, startColumn, length, orientation, clue, wordNumber};
        }).sort((clueA, clueB) => clueA.number - clueB.number);
    }

    /**
     * Get alphabet character from the index.
     *
     * @param {Number} index The character index number start from 0.
     *
     * @return {String} Alphabet character, In case index number higher than 25,
     *  we will add one letter before the current one like Excel: AA, AB, AC, AD, AE etc.
     */
    getColumnLabel(index) {
        let text = '';

        // Get the integer of division and subtraction by 1,
        // The firstLetterIndex will start from -1
        // and increments every index adding more 26.
        const firstLetterIndex = Math.trunc(index / 26) - 1;

        // Get remainder from division result.
        // The lastLetterIndex value is the index of the second letter.
        let lastLetterIndex = index % 26;

        // In case firstLetterIndex < -1 we will not show the first letter.
        if (firstLetterIndex > -1) {
            text = this.retrieveCharacterByIndex(firstLetterIndex);
        }
        // Adding the last letter.
        text += this.retrieveCharacterByIndex(lastLetterIndex);

        return text;
    }

    /**
     * Get alphabet character by index.
     *
     * @param {Number} index Position character number.
     * @return {String} Alphabet character.
     */
    retrieveCharacterByIndex(index) {
        return String.fromCharCode("A".charCodeAt(0) + index);
    }

    /**
     * Check the content of the answer for the existence of special characters.
     *
     * @param {String} answer The answer string need to be check.
     * @return {Boolean} True if the answer is invalid.
     */
    isContainSpecialCharacters(answer) {
        return /([^\p{L}\p{N}\-\s]+)/ugi.test(answer);
    }

    /**
     * Generate underscore letter by length.
     *
     * @param {Number} length Expected length.
     *
     * @return {String} Underscore string.
     */
    makeUnderscore(length) {
        const arr = Array.from({length}, () => '_');
        return arr.join('');
    }

    /**
     * Update the letter index of the word based on the word selected.
     *
     * @param {Object} word The word object.
     */
    updateLetterIndexForCells(word) {
        const {wordNumber} = this.options;
        const letterList = this.options.crosswordEl.querySelectorAll(`g[data-word*='(${wordNumber})']`);
        const ignoreList = this.getIgnoreIndexByAnswerNumber(word.number);
        // Convert letterList to array to use sort function.
        const letterListArray = Array.prototype.slice.call(letterList, 0);
        let letterIndex = 0;
        // Rearrange the letters in the correct order.
        letterListArray.sort((a, b) => {
            let aValue = parseInt(a.querySelector('rect').getAttributeNS(null, 'x'));
            let bValue = parseInt(b.querySelector('rect').getAttributeNS(null, 'x'));
            if (word.orientation) {
                aValue = parseInt(a.querySelector('rect').getAttributeNS(null, 'y'));
                bValue = parseInt(b.querySelector('rect').getAttributeNS(null, 'y'));
            }
            return aValue - bValue;
        }).forEach(el => {
            // Incase the letter index in ignore list we must skip it.
            if (ignoreList.includes(letterIndex)) {
                letterIndex = this.generateLetterIndex(letterIndex, ignoreList, word.length);
            }
            // Update letter index.
            el.dataset.letterindex = letterIndex;
            letterIndex++;
        });
    }

    /**
     * Calculate and retreive the letter index.
     *
     * @param {Number} letterIndex The current letter index.
     * @param {Array} ignoreList The ignore list; If the letter contains space or hyphen or apostrophes.
     * @param {Number} wordLength The word length.
     * characters. We have to ignore it.
     * @return {Number} The new letter index.
     */
    generateLetterIndex(letterIndex, ignoreList, wordLength) {
        letterIndex++;
        // If the new letter index still in ignore list;
        // We need to increase it again.
        if (ignoreList.includes(letterIndex) || letterIndex > wordLength - 1) {
            return this.generateLetterIndex(letterIndex, ignoreList, wordLength);
        }
        return letterIndex;
    }

    /**
     * Toggle focus the clue.
     */
    focusClue() {
        const {wordNumber} = this.options;
        const containCrosswordEl = this.options.crosswordEl.closest('.qtype_crossword-grid-wrapper');
        const clueEl = containCrosswordEl.querySelector(`.wrap-clue[data-questionid='${wordNumber}']`);
        const clueFocusEl = containCrosswordEl.querySelector(`.wrap-clue.focus`);
        // Remove the current focus cell.
        if (clueFocusEl) {
            clueFocusEl.classList.remove('focus');
        }
        // Add focus cell.
        if (clueEl) {
            clueEl.classList.add('focus');
        }
    }

    /**
     * Set sticky clue for the mobile version.
     */
    setStickyClue() {
        const stickyClue = this.options.crosswordEl.closest('.qtype_crossword-grid-wrapper').querySelector('.sticky-clue');
        const {wordNumber, words} = this.options;
        const word = words.find(o => o.number === parseInt(wordNumber));
        const clueWrapperSelector = `.contain-clue .wrap-clue[data-questionid="${wordNumber}"]`;
        const clueContent = this.options.crosswordEl.closest('.qtype_crossword-grid-wrapper')
            .querySelector(clueWrapperSelector + ' .clue-content').innerHTML;
        const clueCount = this.options.crosswordEl.closest('.qtype_crossword-grid-wrapper')
            .querySelector(clueWrapperSelector + ' .clue-count').innerText;
        if (!stickyClue && word) {
            return;
        }
        let strongEl = stickyClue.querySelector('strong');
        let clueEl = stickyClue.querySelector('span.clue');
        let countEl = stickyClue.querySelector('span.count');
        if (!strongEl) {
            strongEl = document.createElement('strong');
            strongEl.classList.add('me-1', 'text-nowrap');
            stickyClue.append(strongEl);
        }
        if (!clueEl) {
            clueEl = document.createElement('span');
            clueEl.classList.add('clue', 'clearfix');
            stickyClue.append(clueEl);
        }
        if (!countEl) {
            countEl = document.createElement('span');
            countEl.classList.add('count', 'text-nowrap', 'ms-1');
            stickyClue.append(countEl);
        }
        strongEl.innerText = `${word.number} ${this.options.orientation[word.orientation]}`;
        clueEl.innerHTML = clueContent;
        countEl.innerText = clueCount;
    }

    /**
     * Focus crossword cell from the start index.
     *
     * @param {String} value The value string need to be replaced.
     * @return {String} The value data.
     */
    replaceText(value) {
        return value.replace(/([^\p{L}\p{N}\s]+)/ugi, '');
    }

    /**
     * Bind data to the clue.
     *
     * @param {Element} gEl The word letter.
     * @param {String} key The letter data.
     */
    bindDataToClueInput(gEl, key) {
        const {words} = this.options;
        const rectEl = gEl.querySelector('rect');
        const conflictPointX = rectEl.getAttributeNS(null, 'x');
        const conflictPointY = rectEl.getAttributeNS(null, 'y');
        let letterIndex, value;
        if (gEl) {
            let wordIds = gEl.dataset.word.match(/\d+/g);
            wordIds.forEach(wordId => {
                const word = words.find(o => o.number === parseInt(wordId));
                if (word) {
                    letterIndex = this.findCellOrder(word, conflictPointX, conflictPointY);
                    const clueInputEl = this.options.crosswordEl
                        .closest('.qtype_crossword-grid-wrapper')
                        .querySelector(`.wrap-clue[data-questionid='${wordId}'] input`);
                    // Replace spaces with an underscore character before binding to the answer input.
                    if (key === ' ') {
                        key = '_';
                    }
                    letterIndex = this.findTheValidLetterIndex(letterIndex, word);
                    value = this.replaceAt(clueInputEl.value, letterIndex, key);
                    let answerString = value.toUpperCase() + this.makeUnderscore(word.length - value.length);
                    const ignoreList = this.getIgnoreIndexByAnswerNumber(word.number, false);
                    answerString = this.mapAnswerAndSpecialLetter(answerString, ignoreList[0]);
                    clueInputEl.value = answerString;
                }
            });
        }
    }

    /**
     * Calculate the position of each letter of the word.
     *
     * @param {Object} word The current word object.
     * @param {Number} key The letter index of word.
     *
     * @return {Object} The coordinates of letter.
     */
    calculatePosition(word, key) {
        const {cellWidth, cellHeight} = this.options;
        let x = cellWidth * word.startColumn;
        let y = cellHeight * word.startRow;
        if (word.orientation) {
            y += (key * cellHeight);
        } else {
            x += (key * cellWidth);
        }
        return {x, y};
    }

    /**
     * Replace letter at index.
     *
     * @param {String} text Text need to be replaced.
     * @param {Number} index Letter index.
     * @param {String} char The replace letter.
     *
     * @return {String} Underscore string.
     */
    replaceAt(text, index, char) {
        let a = text.split('');
        if (a[index] !== undefined) {
            a[index] = char;
        }
        return a.join('');
    }

    /**
     * Sync data to crossword cell from text.
     *
     * @param {String} text The text data.
     * @param {Boolean} skipEmptyData Allow skip rendering blank answers,
     *      if false, we will update the crossword grid even if the answer input is blank.
     * @return {Boolean} Is valid text string.
     */
    syncLettersByText(text, skipEmptyData = true) {
        const {wordNumber} = this.options;
        // Skip empty string.
        if (text.replace(/_/g, '').length === 0 && skipEmptyData) {
            return false;
        }
        for (let i in text) {
            const gEl = this.options.crosswordEl.querySelector(`g[data-word*='(${wordNumber})'][data-letterindex='${i}']`);
            if (gEl) {
                const letter = text[i].toUpperCase();
                const textEl = gEl.querySelector('text.crossword-cell-text');
                if (text[i] !== '_') {
                    textEl.innerHTML = letter;
                } else {
                    textEl.innerHTML = '';
                }
                this.bindDataToClueInput(gEl, letter);
            }
        }
        return true;
    }

    /**
     * Toggle the highlight cells.
     *
     * @param {Object} word The word object.
     * @param {Element} gEl The g element.
     */
    toggleHighlight(word, gEl) {
        const {wordNumber, orientation, title} = this.options;
        const focus = wordNumber;
        const focusedEl = this.options.crosswordEl.querySelector('.crossword-cell-focussed');
        if (focusedEl) {
            focusedEl.classList.remove('crossword-cell-focussed');
        }
        // Remove current highlight cells.
        this.options.crosswordEl.querySelectorAll('.crossword-cell-highlighted')
            .forEach(el => el.classList.remove('crossword-cell-highlighted'));
        // Set highlight cells.
        this.options.crosswordEl.querySelectorAll(`g[data-word*='(${focus})'] rect`)
            .forEach(el => {
                    let titleData = '';
                    if (el.closest('g').dataset.code === gEl.dataset.code) {
                        el.classList.add('crossword-cell-focussed');
                        const conflictPointX = gEl.querySelector('rect').getAttributeNS(null, 'x');
                        const conflictPointY = gEl.querySelector('rect').getAttributeNS(null, 'y');
                        // Update aria label.
                        let letterIndex = this.findCellOrder(word, conflictPointX, conflictPointY);
                        const data = {
                            row: word.startRow + 1,
                            column: word.startColumn + letterIndex + 1,
                            number: word.wordNumber,
                            orientation: orientation[word.orientation],
                            clue: word.clue,
                            letter: letterIndex + 1,
                            count: word.length - this.getIgnoreIndexByAnswerNumber(wordNumber).length,
                        };
                        if (word.orientation) {
                            data.row = word.startRow + letterIndex + 1;
                            data.column = word.startColumn + 1;
                        }
                        titleData = this.replaceStringData(title, data);
                        this.options.crosswordEl.querySelector('input.crossword-hidden-input')
                            .setAttributeNS(null, 'aria-label', titleData);

                    } else {
                        el.classList.add('crossword-cell-highlighted');
                    }
                }
            );
    }

    /**
     * Replace string data.
     *
     * @param {String} str The string need to be replaced.
     * @param {Object} data The data.
     *
     * @return {String} The replaced string.
     */
    replaceStringData(str, data) {
        for (let key in data) {
            str = str.replace(`{${key}}`, data[key]);
        }
        return str;
    }

    /**
     * Sync data between clue section and crossword.
     */
    syncDataForInit() {
        const {words} = this.options;
        // Loop every input into clue section.
        this.options.crosswordEl.closest('.qtype_crossword-grid-wrapper').querySelectorAll('.wrap-clue input')
            .forEach(element => {
                // Tricky, update word number.
                this.options.wordNumber = parseInt(element.closest('.wrap-clue').dataset.questionid);
                const word = words.find(o => o.number === this.options.wordNumber);
                if (!word) {
                    return;
                }
                // Sorting and Updating letter index.
                this.updateLetterIndexForCells(word);
                // The value will be filled into the valid cell.
                this.syncLettersByText(element.value);
            });
        // Set wordNumber by default value.
        this.options.wordNumber = -1;
    }

    /**
     * Set size for crossword.
     *
     * @param {Element} svg The svg element.
     * @return {Element} The svg element after set size.
     */
    setSizeForCrossword(svg) {
        const {colsNum, maxSizeCell, minSizeCell} = this.options;
        // Get max width and min width for crossword with current max cell size and min cell size.
        const maxWidth = colsNum * maxSizeCell;
        const minWidth = colsNum * minSizeCell;
        // To avoid the case that the crossword has too high a height when we have many rows (eg 30) and too few columns (eg 3).
        // We will limit the maximum height of the crossword.
        // This reduces the size of the crossword but still ensures that the size of each cell keep in the range min and max sizes.
        const maxHeight = this.MAX_ROW * minSizeCell;
        svg.style.cssText = `max-width: ${maxWidth}px; min-width: ${minWidth}px;
            max-height: ${maxHeight}px;`;
        return svg;
    }

    /**
     * Get ignore letter index by answer number.
     *
     * @param {Number} answerNumber The answer number.
     * @param {Boolean} forceFlatObject Convert ignore index object to array and flat it; By default is true;
     * @return {Array} List ignore letter index.
     */
    getIgnoreIndexByAnswerNumber(answerNumber, forceFlatObject = true) {
        const {crosswordEl} = this.options;
        // Get ignore indexes list from element. It should look like {"space":[3, 5],"hyphen":[11]};
        // It contains special characters that exist in that answer with their index.
        // With the example data above, we can see that in this answer there are two spaces and one hyphen;
        // The indexes of the space are 3, 5 and with the hyphen are 11.
        let ignoreIndexes = crosswordEl.closest('.qtype_crossword-grid-wrapper')?.querySelector(
            `.contain-clue .wrap-clue[data-questionid='${answerNumber}']`)?.dataset?.ignoreindexes ?? '[]';
        ignoreIndexes = JSON.parse(ignoreIndexes);
        if (Array.isArray(ignoreIndexes) && ignoreIndexes.length === 0) {
            ignoreIndexes = {};
        }
        // In the case, we just want to get the index of the special characters existing in this answer.
        // E.g: [3, 5, 11].
        if (forceFlatObject) {
            return Object.values(ignoreIndexes).flat().sort((a, b) => {
                return a - b;
            });
        }
        // Return full ignoreIndexes.
        // E.g: [{space:[3, 5], hyphen:[11]}].
        return [ignoreIndexes];
    }

    /**
     * Based on the answer string and special list, we will mix them together;
     * e.g: the answer has 4 letters and the special list is {hyphen: [2]},
     * the result will be: _ _ - _. We will replace the 2nd letter with the hyphen character (based on replaceLetter option).
     *
     * @param {String} answer The answer string which will be handled.
     * @param {Object} specialList The special object contains a list of special characters and their indexes.
     * E.g: {hyphen: [1, 2]}.
     * @return {String} The mixed answer.
     */
    mapAnswerAndSpecialLetter(answer, specialList) {
        const specials = this.options.specialCharacters;
        if (Object.keys(specialList).length === 0 && specialList.constructor === Object) {
            return answer;
        }
        for (let character in specialList) {
            if (specials[character] !== undefined) {
                for (let index of specialList[character]) {
                    // Replace character.
                    answer = this.replaceAt(answer, index, specials[character]);
                }
            }
        }
        return answer;
    }

    /**
     * Find the next or previous valid cell in the grid crossword based on index.
     * E.g: Answer ALL-IN contains 6 letters, but in the crossword grid only 5 cells are displayed (no hyphen).
     * And the letterindex property of each cell will be 0, 1, 2, 4, 5 (ignoring the hyphen index). So
     * the next cell of the letter L (index 2) will be I (index 4).
     *
     * @param {Number} wordNumber The word selected number.
     * @param {Object} word The word selected object.
     * @param {Number} selectionIndex The selection index.
     * @param {Boolean} isAscending If True find the next cell else find the previous cell.
     * @return {Array} List contains the next/previous selection index and the next/previous g element.
     */
    findTheClosestCell(wordNumber, word, selectionIndex, isAscending = true) {
        let count = selectionIndex;
        let number = -1;
        let notFound = true;
        let closestCell = [];

        // Find the next cell.
        if (isAscending) {
            number = Math.abs(number);
        }

        // We have to iterate through the crossword cell of a specific answer to find the closest valid one.
        while (notFound) {
            // The special characters will not be shown in a grid,
            // So we have to find another cell by increasing/decreasing the selection Index.
            const gelEl = this.options.crosswordEl
            .querySelector(`g[data-word*='(${wordNumber})'][data-letterindex='${count}']`);
            if (gelEl || count > word.length || count <= 0) {
                notFound = false;
                closestCell = [count, gelEl];
            }
            count += number;
        }
        return closestCell;
    }

    /**
     * Find the valid letter index of answer input.
     * E.g: The answer contains a hyphen: ALL-IN and the answer input will be displayed
     * _ _ _ - _ _. With a hyphen (index 4), the user cannot interact.
     * So the next valid letter index right after the letter index 2 (Letter L) is 4 (not 3).
     *
     * @param {Number} selectedIndex The selected index.
     * @param {Object} word The word selected object.
     * @param {Boolean} isAscending Find index in ascending or descending order, default true.
     * @return {Number} Return new valid letter index.
     */
    findTheValidLetterIndex(selectedIndex, word, isAscending = true) {
        // Retrieve invalid index and sort it in ascending order.
        const ignoreIndexes = this.getIgnoreIndexByAnswerNumber(word.number);
        let number = -1;
        // Find the next letter index.
        if (isAscending) {
            number = Math.abs(number);
        }
        // Since there's an index difference between the cell grid and the answer input
        // (the grid cells won't display special characters) we'll add/minus the difference.
        for (let invalidIndex of ignoreIndexes) {
            if (selectedIndex >= invalidIndex) {
                if (!isAscending && selectedIndex === invalidIndex) {
                    continue;
                }
                selectedIndex += number;
            }
        }
        return selectedIndex;
    }

    /**
     * Find the valid cell index from answer index.
     *
     * @param {Object} word The word selected object.
     * @param {Number} answerIndex The selected letter index.
     * @param {Boolean} skipIgnoreIndex If true, we will not count invalid index; Default true.
     * @return {Number} Return new valid cell index.
     */
    findCellIndexFromAnswerIndex(word, answerIndex, skipIgnoreIndex = true) {
        // Get special index list.
        let ignoreIndexes = this.getIgnoreIndexByAnswerNumber(word.number);
        let cellIndex = answerIndex;
        // Loop to find valid index.
        for (let index = cellIndex; index < word.length; index++) {
            if (ignoreIndexes.includes(index)) {
                cellIndex++;
            } else {
                break;
            }
        }
        // Return valid index excluding special index.
        // E.g: With the answer: TIM BERNERS-LEE  the next letter after letter B (index 4) is E (index 5);
        // If skipIgnoreIndex is true, we will not count letter space (index 3).
        // So the new letter index will be 4.
        if (skipIgnoreIndex) {
            return cellIndex - ignoreIndexes.filter(index => index <= cellIndex).length;
        }
        return cellIndex;
    }

    /**
     * Find the order of the cell (starting at 0) based on coordinate of that cell.
     *
     * @param {Object} word The word selected object.
     * @param {String} xCoordinate The x coordinate of cell.
     * @param {String} yCoordinate The y coordinate of cell.
     * @return {Number} The cell order.
     */
    findCellOrder(word, xCoordinate, yCoordinate) {
        const {cellWidth, cellHeight} = this.options;
        const startPoint = this.calculatePosition(word, 0);
        if (word.orientation) {
            return (parseInt(yCoordinate) - startPoint.y) / (cellHeight);
        }
        return (parseInt(xCoordinate) - startPoint.x) / (cellWidth);
    }
}
