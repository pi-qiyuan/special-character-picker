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
    categorySelection: document.querySelector('.category-selection'),
    manageCatsBtn: document.getElementById('manage-cats-btn'),
    contextMenu: document.getElementById('context-menu'),
    charPreview: document.getElementById('char-preview'),
    editorContainer: document.querySelector('.editor-container'),
    buttonContainer: document.querySelector('.button-container'),
    clearBtn: document.getElementById('clear-btn'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    // Tag Editor Elements
    tagEditorOverlay: document.getElementById('tag-editor-overlay'),
    editingCharDisplay: document.getElementById('editing-char-display'),
    defaultTagsDisplay: document.getElementById('default-tags-display'),
    userTagsInput: document.getElementById('user-tags-input'),
    cancelTagsBtn: document.getElementById('cancel-tags-btn'),
    saveTagsBtn: document.getElementById('save-tags-btn'),
    // Milestone Banner Elements
    milestoneBanner: document.getElementById('milestone-banner'),
    milestoneMessage: document.getElementById('milestone-message'),
    milestoneRateBtn: document.getElementById('milestone-rate-btn'),
    milestoneCoffeeBtn: document.getElementById('milestone-coffee-btn'),
    milestoneCloseBtn: document.getElementById('milestone-close-btn'),
    // Category Manager Elements
    catManagerOverlay: document.getElementById('cat-manager-overlay'),
    catList: document.getElementById('cat-list'),
    newCatInput: document.getElementById('new-cat-input'),
    addCatBtn: document.getElementById('add-cat-btn'),
    closeCatManagerBtn: document.getElementById('close-cat-manager-btn'),
    // Category Selector Elements
    catSelectorOverlay: document.getElementById('cat-selector-overlay'),
    catOptions: document.getElementById('cat-options'),
    cancelCatSelectorBtn: document.getElementById('cancel-cat-selector-btn')
  },

  /**
   * Milestone Banner Methods
   */
  showMilestoneBanner(messageKey, showRate = true, showCoffee = true) {
    const { milestoneBanner, milestoneMessage, milestoneRateBtn, milestoneCoffeeBtn } = this.elements;
    if (!milestoneBanner) return;

    milestoneMessage.textContent = getMessage(messageKey);
    milestoneRateBtn.style.display = showRate ? 'block' : 'none';
    milestoneCoffeeBtn.style.display = showCoffee ? 'block' : 'none';
    milestoneBanner.style.display = 'block';
  },

  hideMilestoneBanner() {
    if (this.elements.milestoneBanner) {
      this.elements.milestoneBanner.style.display = 'none';
    }
  },

  /**
   * Populate the category dropdown
   */
  populateCategorySelect(categoryConfig, isFavorites = false) {
    const select = this.elements.categorySelect;
    select.innerHTML = '';
    categoryConfig.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      // If it's a fixed category (id exists in config), translate it. 
      // Otherwise it's a user-defined category, use name directly.
      option.textContent = (cat.nameKey ? getMessage(cat.nameKey) : cat.name) || cat.id;
      if (cat.isDefault) {
        option.textContent = getMessage('defaultCategory') || cat.name;
      }
      select.appendChild(option);
    });
    
    // Toggle manage button
    this.elements.manageCatsBtn.style.display = isFavorites ? 'flex' : 'none';
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
    const displayStyle = isEditMode ? 'flex' : 'none';

    if (editorContainer) editorContainer.style.display = displayStyle;
    if (buttonContainer) buttonContainer.style.display = displayStyle;

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
  renderCharGrid(categoryKey, characters, currentMode, callbacks, userTags = {}, isFavorites = false) {
    const grid = this.elements.charGrid;
    grid.innerHTML = '';
    
    // Show category selection if not searching
    this.elements.categorySelection.style.display = 'flex';

    // Sync category select value
    if (this.elements.categorySelect.querySelector(`option[value="${categoryKey}"]`)) {
      this.elements.categorySelect.value = categoryKey;
    }

    if (!characters || characters.length === 0) {
      const placeholderKey = isFavorites ? 'noFavorites' : 'noCharacters';
      grid.innerHTML = `<div class="placeholder-message">${getMessage(placeholderKey)}</div>`;
      return;
    }

    this._renderCharacters(characters, callbacks, userTags);
  },

  /**
   * Render search results
   */
  renderSearchResults(results, callbacks, userTags = {}) {
    const grid = this.elements.charGrid;
    grid.innerHTML = '';
    
    // Hide category selection when searching
    this.elements.categorySelection.style.display = 'none';

    if (!results || results.length === 0) {
      grid.innerHTML = `<div class="placeholder-message">${getMessage('noResults')}</div>`;
      return;
    }

    // Results are already limited to 50 in the controller, but we can double check here
    const displayResults = results.slice(0, 50);
    this._renderCharacters(displayResults, callbacks, userTags);
  },

  /**
   * Internal helper to render character cells
   */
  _renderCharacters(characters, callbacks, userTags) {
    const grid = this.elements.charGrid;
    
    characters.forEach(char => {
      const charCell = document.createElement('div');
      charCell.classList.add('char-cell');
      charCell.textContent = char;
      charCell.dataset.char = char;

      // Add user tag marker if exists
      if (userTags[char]) {
        charCell.classList.add('has-user-tag');
      }

      // Click event
      charCell.addEventListener('click', () => {
        const previouslySelected = grid.querySelector('.char-cell.selected');
        if (previouslySelected && previouslySelected !== charCell) {
          previouslySelected.classList.remove('selected');
        }
        charCell.classList.add('selected');
        callbacks.onCharClick(char, charCell);
        this.hidePreview();
      });
      
      charCell.addEventListener('mouseenter', () => {
        this._previewTimeout = setTimeout(() => this.showPreview(char, charCell), 150);
      });
      
      charCell.addEventListener('mouseleave', () => {
        clearTimeout(this._previewTimeout);
        this.hidePreview();
      });
      
      charCell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        callbacks.onCharContextMenu(char, e);
      });
      
      grid.appendChild(charCell);
    });

    this._normalizeCellWidths();
  },

  /**
   * Show character preview (zoom effect)
   */
  showPreview(char, charCell) {
    const preview = this.elements.charPreview;
    if (!preview) return;

    preview.textContent = char;
    preview.style.display = 'flex';
    
    const rect = charCell.getBoundingClientRect();
    const previewWidth = preview.offsetWidth;
    const previewHeight = preview.offsetHeight;
    
    let left = rect.left + (rect.width / 2) - (previewWidth / 2);
    let top = rect.top - previewHeight - 10;
    
    if (left < 5) left = 5;
    if (left + previewWidth > window.innerWidth - 5) {
      left = window.innerWidth - previewWidth - 5;
    }
    
    if (top < 5) {
      top = rect.bottom + 10;
    }
    
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  },

  /**
   * Hide character preview
   */
  hidePreview() {
    if (this.elements.charPreview) {
      this.elements.charPreview.style.display = 'none';
    }
  },

  /**
   * Show context menu at specific position
   */
  showContextMenu(x, y, char, category) {
    this.hidePreview();
    const menu = this.elements.contextMenu;
    let menuHTML = '';
    
    // Core menu items (Edit Tags is always available)
    const editTagsHTML = `<div class="context-menu-item" data-action="edit-tags">
      ${getMessage('editTags')}
    </div>`;

    // Is it a favorite category?
    const isFavoriteCat = ['favorites', 'recent', 'search'].includes(category) === false && 
                          !document.getElementById('category-select').disabled;
    const isActuallyFavoritesMode = document.getElementById('favorites-btn').classList.contains('active');

    if (isActuallyFavoritesMode) {
      menuHTML = editTagsHTML + `<div class="context-menu-item" data-action="remove">
        ${getMessage('removeFromFavorites')}
      </div>`;
    } else if (category === 'recent') {
      menuHTML = editTagsHTML + `
        <div class="context-menu-item" data-action="add">${getMessage('addToFavorites')}</div>
        <div class="context-menu-item" data-action="delete">${getMessage('delete')}</div>
      `;
    } else {
      menuHTML = editTagsHTML + `<div class="context-menu-item" data-action="add">
        ${getMessage('addToFavorites')}
      </div>`;
    }

    menu.innerHTML = menuHTML;
    menu.style.display = 'block';
    
    const menuWidth = menu.offsetWidth || 140;
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
   * Tag Editor Methods
   */
  showTagEditor(char, defaultTags, userTags) {
    this.elements.editingCharDisplay.textContent = char;
    this.elements.defaultTagsDisplay.textContent = defaultTags || '-';
    this.elements.userTagsInput.value = userTags || '';
    this.elements.tagEditorOverlay.style.display = 'flex';
    this.elements.userTagsInput.focus();
  },

  hideTagEditor() {
    this.elements.tagEditorOverlay.style.display = 'none';
  },

  /**
   * Category Manager Methods
   */
  showCatManager(categories, callbacks) {
    const list = this.elements.catList;
    list.innerHTML = '';
    
    categories.forEach(cat => {
      const item = document.createElement('div');
      item.classList.add('cat-item');
      
      const name = document.createElement('span');
      name.classList.add('cat-name');
      name.textContent = cat.isDefault ? (getMessage('defaultCategory') || cat.name) : cat.name;
      
      item.appendChild(name);
      
      if (!cat.isDefault) {
        const actions = document.createElement('div');
        actions.classList.add('cat-actions');
        
        const renameBtn = document.createElement('button');
        renameBtn.classList.add('cat-action-btn');
        renameBtn.title = getMessage('rename');
        renameBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>';
        renameBtn.onclick = () => {
          const newName = prompt(getMessage('renameCategory'), cat.name);
          if (newName && newName.trim()) {
            callbacks.onRename(cat.id, newName.trim());
          }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('cat-action-btn', 'delete');
        deleteBtn.title = getMessage('delete');
        deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>';
        deleteBtn.onclick = () => {
          if (confirm(getMessage('deleteConfirm'))) {
            callbacks.onDelete(cat.id);
          }
        };
        
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
      }
      
      list.appendChild(item);
    });
    
    this.elements.catManagerOverlay.style.display = 'flex';
  },

  hideCatManager() {
    this.elements.catManagerOverlay.style.display = 'none';
    this.elements.newCatInput.value = '';
  },

  /**
   * Category Selector Methods
   */
  showCatSelector(categories, callback) {
    const list = this.elements.catOptions;
    list.innerHTML = '';
    
    categories.forEach(cat => {
      const option = document.createElement('div');
      option.classList.add('cat-option');
      option.textContent = cat.isDefault ? (getMessage('defaultCategory') || cat.name) : cat.name;
      option.onclick = () => {
        callback(cat.id);
        this.hideCatSelector();
      };
      list.appendChild(option);
    });
    
    this.elements.catSelectorOverlay.style.display = 'flex';
  },

  hideCatSelector() {
    this.elements.catSelectorOverlay.style.display = 'none';
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
