/**
 * UI View Manager - Handles all DOM manipulations and rendering
 */
import { getMessage } from '../utils/i18n.js';

export const View = {
  // DOM Cache
  elements: {
    commonBtn: document.getElementById('common-btn'),
    favoritesBtn: document.getElementById('favorites-btn'),
    charGrid: document.getElementById('char-grid'),
    editorInput: document.getElementById('editor-input'),
    copyBtn: document.getElementById('copy-btn'),
    insertBtn: document.getElementById('insert-btn'),
    modeRadios: document.querySelectorAll('input[name="mode"]'),
    categorySelect: document.getElementById('category-select'),
    contextMenu: document.getElementById('context-menu'),
    editorContainer: document.querySelector('.editor-container'),
    buttonContainer: document.querySelector('.button-container'),
    clearBtn: document.getElementById('clear-btn')
  },

  /**
   * Populate the category dropdown
   */
  populateCategorySelect(categoryConfig) {
    const select = this.elements.categorySelect;
    select.innerHTML = '';
    categoryConfig.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = getMessage(cat.nameKey) || cat.id;
      select.appendChild(option);
    });
  },

  /**
   * Update the active state of quick access buttons
   */
  updateQuickAccessActiveState(activeId) {
    this.elements.commonBtn.classList.toggle('active', this.elements.commonBtn.id === activeId);
    this.elements.favoritesBtn.classList.toggle('active', this.elements.favoritesBtn.id === activeId);
  },

  /**
   * Update UI based on the selected mode
   */
  updateUIForMode(mode) {
    const { editorInput, copyBtn, insertBtn, editorContainer, buttonContainer } = this.elements;
    
    // Logic for hiding/showing editor and buttons
    const isEditMode = mode === 'appendEdit';
    const visibility = isEditMode ? 'visible' : 'hidden';

    // Use visibility: hidden to maintain layout space
    if (editorContainer) editorContainer.style.visibility = visibility;
    if (buttonContainer) buttonContainer.style.visibility = visibility;

    editorInput.readOnly = !isEditMode;
    
    const isEmpty = editorInput.value.length === 0;
    copyBtn.disabled = !isEditMode || isEmpty;
    insertBtn.disabled = !isEditMode || isEmpty;

    const previouslySelected = document.querySelector('.char-cell.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
    }
  },

  /**
   * Update editor buttons state based on input content
   */
  updateEditorButtonsState() {
    const { editorInput, copyBtn, insertBtn } = this.elements;
    const isEmpty = editorInput.value.length === 0;
    copyBtn.disabled = isEmpty;
    insertBtn.disabled = isEmpty;
  },

  /**
   * Render the character grid
   */
  renderCharGrid(categoryKey, characters, currentMode, callbacks) {
    const grid = this.elements.charGrid;
    grid.innerHTML = '';
    
    // Sync category select value if it's not the favorites category
    if (categoryKey !== 'favorites' && this.elements.categorySelect.querySelector(`option[value="${categoryKey}"]`)) {
      this.elements.categorySelect.value = categoryKey;
    }

    if (!characters || characters.length === 0) {
      const placeholderKey = categoryKey === 'favorites' ? 'noFavorites' : 'noCharacters';
      grid.innerHTML = `<div class="placeholder-message">${getMessage(placeholderKey)}</div>`;
      return;
    }

    characters.forEach(char => {
      const charCell = document.createElement('div');
      charCell.classList.add('char-cell');
      charCell.textContent = char;
      charCell.dataset.char = char;

      // Click event
      charCell.addEventListener('click', () => {
        const previouslySelected = grid.querySelector('.char-cell.selected');
        if (previouslySelected && previouslySelected !== charCell) {
          previouslySelected.classList.remove('selected');
        }
        charCell.classList.add('selected');
        callbacks.onCharClick(char, charCell);
      });
      
      // Context menu event
      charCell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        callbacks.onCharContextMenu(char, e);
      });
      
      grid.appendChild(charCell);
    });

    this._normalizeCellWidths();
  },

  /**
   * Show context menu at specific position
   */
  showContextMenu(x, y, category) {
    const menu = this.elements.contextMenu;
    let menuHTML = '';
    
    if (category === 'favorites') {
      menuHTML = `<div class="context-menu-item" data-action="remove">
        ${getMessage('removeFromFavorites')}
      </div>`;
    } else if (category === 'recent') {
      menuHTML = `
        <div class="context-menu-item" data-action="add">${getMessage('addToFavorites')}</div>
        <div class="context-menu-item" data-action="delete">${getMessage('delete')}</div>
      `;
    } else {
      menuHTML = `<div class="context-menu-item" data-action="add">
        ${getMessage('addToFavorites')}
      </div>`;
    }

    menu.innerHTML = menuHTML;

    menu.style.display = 'block';
    
    const menuWidth = menu.offsetWidth || 120;
    const menuHeight = menu.offsetHeight || 40;
    let left = Math.min(x, window.innerWidth - menuWidth - 5);
    let top = Math.min(y, window.innerHeight - menuHeight - 5);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  },

  hideContextMenu() {
    this.elements.contextMenu.style.display = 'none';
  },

  /**
   * Internal helper to ensure all grid cells have uniform width
   */
  _normalizeCellWidths() {
    const cells = this.elements.charGrid.querySelectorAll('.char-cell');
    if (cells.length > 0) {
      let maxWidth = 0;
      cells.forEach(cell => {
        cell.style.width = 'auto';
        maxWidth = Math.max(maxWidth, cell.scrollWidth);
      });
      cells.forEach(cell => cell.style.width = `${maxWidth}px`);
    }
  }
};
