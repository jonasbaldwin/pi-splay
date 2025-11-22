import { QuickNotesTileData, QuickNote } from '../types';

export class QuickNotesModule {
  private element: HTMLElement;
  private data: QuickNotesTileData;
  private notesList!: HTMLElement;
  private addNoteBtn!: HTMLElement;

  constructor(element: HTMLElement, data: QuickNotesTileData) {
    this.element = element;
    this.data = data;
    
    // Initialize with default note if no notes exist
    if (!this.data.notes || this.data.notes.length === 0) {
      this.data.notes = [{
        id: this.generateNoteId(),
        content: 'Made with ❤️ by JonasBaldwin.com.\n\nFork at github.com/jonasbaldwin/pi-splay\n\nSupport my current work in progress at StashBot.app.',
        createdAt: Date.now()
      }];
    }
    
    this.initialize();
  }

  private generateNoteId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="quick-notes-module">
        <div class="quick-notes-header">
          <h3 class="quick-notes-title">Quick Notes</h3>
          <button class="quick-notes-add-btn" data-add-note title="Add note">+</button>
        </div>
        <div class="quick-notes-list" data-notes-list></div>
      </div>
    `;

    this.notesList = this.element.querySelector('[data-notes-list]')!;
    this.addNoteBtn = this.element.querySelector('[data-add-note]')!;

    // Add click handler for add button
    this.addNoteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addNote();
    });

    this.updateNotes();
  }

  private addNote(): void {
    const newNote: QuickNote = {
      id: this.generateNoteId(),
      content: '',
      createdAt: Date.now()
    };
    this.data.notes.unshift(newNote); // Add to beginning
    this.updateNotes();
    this.saveToStorage();
    
    // Focus the newly added note for editing
    setTimeout(() => {
      const noteItem = this.notesList.querySelector(`[data-note-item-id="${newNote.id}"]`) as HTMLElement;
      if (noteItem) {
        const displayEl = noteItem.querySelector('.note-content-display') as HTMLElement;
        const editEl = noteItem.querySelector('.note-content-edit') as HTMLElement;
        if (displayEl && editEl) {
          // Switch to edit mode
          displayEl.style.display = 'none';
          editEl.style.display = 'block';
          editEl.focus();
          // Place cursor at the end
          const range = document.createRange();
          range.selectNodeContents(editEl);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }, 0);
  }

  private removeNote(noteId: string): void {
    this.data.notes = this.data.notes.filter(note => note.id !== noteId);
    this.updateNotes();
    this.saveToStorage();
  }

  private reorderNotes(draggedNoteId: string, targetNoteId: string, mouseY: number): void {
    const draggedIndex = this.data.notes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = this.data.notes.findIndex(n => n.id === targetNoteId);
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }
    
    // Determine if we should insert before or after the target
    const targetElement = this.notesList.querySelector(`[data-note-item-id="${targetNoteId}"]`) as HTMLElement;
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const insertBefore = mouseY < midpoint;
      
      // Remove the dragged note
      const [draggedNote] = this.data.notes.splice(draggedIndex, 1);
      
      // Calculate new index
      let newIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        // Moving down - adjust index
        newIndex = insertBefore ? targetIndex - 1 : targetIndex;
      } else {
        // Moving up - adjust index
        newIndex = insertBefore ? targetIndex : targetIndex + 1;
      }
      
      // Insert at new position
      this.data.notes.splice(newIndex, 0, draggedNote);
      
      // Update display
      this.updateNotes();
      this.saveToStorage();
    }
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent notes
    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // For older notes, show date and time
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  }

  private processMarkdown(content: string): string {
    // Simple markdown processing
    // Process markdown but preserve existing HTML tags (like links from URL processing)
    // We'll process text segments that are not inside HTML tags
    
    // Split by HTML tags and process text segments
    const parts: string[] = [];
    let lastIndex = 0;
    const tagRegex = /<[^>]+>/g;
    let match;
    const tagMatches: Array<{ index: number; length: number }> = [];
    
    // Reset regex
    tagRegex.lastIndex = 0;
    while ((match = tagRegex.exec(content)) !== null) {
      tagMatches.push({ index: match.index, length: match[0].length });
    }
    
    // Process text between tags
    let result = '';
    let currentPos = 0;
    
    for (const tagMatch of tagMatches) {
      // Process text before this tag
      const textBefore = content.substring(currentPos, tagMatch.index);
      result += this.processMarkdownText(textBefore);
      // Add the tag as-is
      result += content.substring(tagMatch.index, tagMatch.index + tagMatch.length);
      currentPos = tagMatch.index + tagMatch.length;
    }
    // Process remaining text
    result += this.processMarkdownText(content.substring(currentPos));
    
    return result;
  }
  
  private processMarkdownText(text: string): string {
    // Convert **text** to <strong>text</strong> first (before single asterisks)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Convert *text* to <em>text</em> (single asterisk, not double)
    // Match single asterisks that are not part of **
    text = text.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
    // Convert `text` to <code>text</code>
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    // Convert # Heading to <h1>Heading</h1>
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }

  private makeUrlsClickable(text: string): string {
    // Comprehensive URL detection that finds:
    // 1. http:// and https:// URLs
    // 2. www. URLs
    // 3. Domain names with TLDs (e.g., example.com, site.net, domain.app)
    
    const urlMatches: Array<{ url: string; index: number; needsProtocol: boolean }> = [];
    
    // Common TLDs list (including the ones mentioned plus common ones)
    // This is a comprehensive but not exhaustive list
    const commonTlds = [
      'com', 'net', 'org', 'edu', 'gov', 'mil', 'int',
      'us', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'ca', 'br', 'in', 'ru', 'mx',
      'app', 'ai', 'bot', 'me', 'biz', 'bz', 'io', 'co', 'tv', 'cc', 'ws',
      'info', 'name', 'mobi', 'pro', 'travel', 'jobs', 'tel', 'asia', 'xxx',
      'tech', 'online', 'site', 'website', 'store', 'shop', 'blog', 'dev',
      'cloud', 'space', 'xyz', 'top', 'win', 'bid', 'download', 'science'
    ];
    
    // Pattern for TLD matching (2-20 letters, covering most TLDs)
    const tldPattern = `(${commonTlds.join('|')}|[a-z]{2,20})`;
    
    // Find http:// and https:// URLs
    const httpPattern = /https?:\/\/[^\s<>"']+/gi;
    let match;
    while ((match = httpPattern.exec(text)) !== null) {
      urlMatches.push({
        url: match[0],
        index: match.index,
        needsProtocol: false
      });
    }
    
    // Find www. URLs (that aren't already part of http:// URLs)
    const wwwPattern = /www\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?:\.[a-z]{2,20})/gi;
    while ((match = wwwPattern.exec(text)) !== null) {
      // Check if this www. URL is already part of an http:// URL
      const isPartOfHttp = urlMatches.some(m => 
        m.index <= match.index && m.index + m.url.length > match.index
      );
      if (!isPartOfHttp) {
        urlMatches.push({
          url: match[0],
          index: match.index,
          needsProtocol: true
        });
      }
    }
    
    // Find domain names with TLDs (e.g., example.com, site.net, github.com/path)
    // Pattern: word characters, dot, TLD (2+ letters), optionally followed by path
    // Exclude if it looks like a number (e.g., "3.14") or common file extensions
    // Match domain with optional path: domain.com/path/to/resource
    const domainPattern = /(?:^|[^a-z0-9@])([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,20}(?:\/[^\s<>"']*)?)(?=[^\w\/]|$)/gi;
    while ((match = domainPattern.exec(text)) !== null) {
      let domain = match[1];
      const matchIndex = match.index + (match[0].length - domain.length); // Adjust for leading non-word char
      
      // Skip if it's already part of a processed URL
      const isPartOfProcessed = urlMatches.some(m => 
        m.index <= matchIndex && m.index + m.url.length > matchIndex
      );
      
      // Skip if it looks like an email (has @ before it in the same word)
      const beforeMatch = text.substring(Math.max(0, matchIndex - 50), matchIndex);
      const hasEmailAt = /@[^\s]*$/.test(beforeMatch);
      
      // Extract just the domain part (without path) for file extension check
      const domainOnly = domain.split('/')[0];
      
      // Skip common file extensions that aren't TLDs
      const fileExtensions = ['txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'zip', 'rar', 'tar', 'gz'];
      const lastPart = domainOnly.split('.').pop()?.toLowerCase();
      const isFileExtension = lastPart && fileExtensions.includes(lastPart);
      
      // Skip if it's just a number with decimals (e.g., "3.14")
      const isNumber = /^\d+\.\d+$/.test(domainOnly);
      
      // Clean up trailing punctuation from the URL (but keep / in paths)
      // Remove trailing punctuation like .,!?;: but preserve /
      domain = domain.replace(/[.,!?;:]+$/, '');
      
      if (!isPartOfProcessed && !hasEmailAt && !isFileExtension && !isNumber && domain.length > 0) {
        urlMatches.push({
          url: domain,
          index: matchIndex,
          needsProtocol: true
        });
      }
    }
    
    // Sort by index in reverse order to process from end to start
    urlMatches.sort((a, b) => b.index - a.index);
    
    // Replace URLs from end to start to maintain correct indices
    let result = text;
    for (const urlMatch of urlMatches) {
      const href = urlMatch.needsProtocol ? `https://${urlMatch.url}` : urlMatch.url;
      const linkTag = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-link">${urlMatch.url}</a>`;
      result = result.substring(0, urlMatch.index) + linkTag + result.substring(urlMatch.index + urlMatch.url.length);
    }
    
    return result;
  }
  
  private escapeHtmlPreservingLinks(text: string): string {
    // Escape HTML but preserve our link tags
    // Split by link tags, escape text parts, keep link tags
    const linkTagRegex = /<a\s+[^>]*>.*?<\/a>/gi;
    const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex
    linkTagRegex.lastIndex = 0;
    while ((match = linkTagRegex.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      // Add link - extract and properly escape href and text
      const linkContent = match[0];
      // Extract href (handle both single and double quotes)
      const hrefMatch = linkContent.match(/href=["']([^"']+)["']/);
      // Extract text content between > and <
      const textMatch = linkContent.match(/>([^<]+)</);
      if (hrefMatch && textMatch) {
        // Escape href and text for security
        const href = this.escapeHtml(hrefMatch[1]);
        const linkText = this.escapeHtml(textMatch[1]);
        // Reconstruct link with proper escaping
        parts.push({ 
          type: 'link', 
          content: `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-link">${linkText}</a>` 
        });
      } else {
        // Fallback: try to preserve as-is if we can't parse it
        parts.push({ type: 'link', content: linkContent });
      }
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    // If no links found, just escape the whole text
    if (parts.length === 0) {
      return this.escapeHtml(text);
    }
    
    // Combine parts
    return parts.map(part => 
      part.type === 'text' ? this.escapeHtml(part.content) : part.content
    ).join('');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private updateNotes(): void {
    if (this.data.notes.length === 0) {
      this.notesList.innerHTML = '<div class="note-placeholder">No notes yet. Click + to add one.</div>';
      return;
    }

    const notesHtml = this.data.notes.map(note => {
      const formattedDate = this.formatDate(note.createdAt);
      
      // Store the raw content - convert newlines to <br> for contenteditable
      const rawContent = this.escapeHtml(note.content).replace(/\n/g, '<br>');
      
      return `
        <div class="note-item" data-note-item-id="${note.id}">
          <div class="note-drag-handle" draggable="true" title="Drag to reorder">⋮⋮</div>
          <button class="note-remove-btn" data-note-id="${note.id}" title="Remove note">×</button>
          <div class="note-content-display" data-note-id="${note.id}"></div>
          <div class="note-content-edit" 
               contenteditable="true" 
               data-note-id="${note.id}"
               data-placeholder="Click to edit..."
               style="display: none;">${rawContent}</div>
          <div class="note-date">${formattedDate}</div>
        </div>
      `;
    }).join('');

    this.notesList.innerHTML = notesHtml;

    // Process and display each note
    this.data.notes.forEach(note => {
      const displayEl = this.notesList.querySelector(`[data-note-item-id="${note.id}"] .note-content-display`) as HTMLElement;
      if (displayEl) {
        this.renderNoteContent(note.content, displayEl);
      }
    });

    // Add remove button handlers
    this.notesList.querySelectorAll('.note-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const noteId = (e.target as HTMLElement).getAttribute('data-note-id');
        if (noteId) {
          this.removeNote(noteId);
        }
      });
    });

    // Add drag and drop handlers for reordering
    this.notesList.querySelectorAll('.note-drag-handle').forEach(handle => {
      const dragHandle = handle as HTMLElement;
      const noteItem = dragHandle.closest('.note-item') as HTMLElement;
      const noteId = noteItem.getAttribute('data-note-item-id')!;
      
      dragHandle.addEventListener('dragstart', (e) => {
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', noteId);
        noteItem.classList.add('dragging');
      });
    });
    
    this.notesList.querySelectorAll('.note-item').forEach(item => {
      const noteItem = item as HTMLElement;
      const noteId = noteItem.getAttribute('data-note-item-id')!;
      
      noteItem.addEventListener('dragend', () => {
        noteItem.classList.remove('dragging');
        // Remove all drag-over classes
        this.notesList.querySelectorAll('.note-item').forEach(n => {
          n.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });
      
      noteItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        
        const draggingItem = this.notesList.querySelector('.note-item.dragging') as HTMLElement;
        if (draggingItem && draggingItem !== noteItem) {
          const rect = noteItem.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const mouseY = e.clientY;
          
          if (mouseY < midpoint) {
            noteItem.classList.add('drag-over-top');
            noteItem.classList.remove('drag-over-bottom');
          } else {
            noteItem.classList.add('drag-over-bottom');
            noteItem.classList.remove('drag-over-top');
          }
        }
      });
      
      noteItem.addEventListener('dragleave', () => {
        noteItem.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      
      noteItem.addEventListener('drop', (e) => {
        e.preventDefault();
        noteItem.classList.remove('drag-over-top', 'drag-over-bottom');
        
        const draggedNoteId = e.dataTransfer!.getData('text/plain');
        if (draggedNoteId && draggedNoteId !== noteId) {
          this.reorderNotes(draggedNoteId, noteId, e.clientY);
        }
      });
    });

    // Add editing handlers for each note content
    this.notesList.querySelectorAll('.note-content-edit[contenteditable]').forEach(editEl => {
      const noteEditEl = editEl as HTMLElement;
      const noteId = noteEditEl.getAttribute('data-note-id')!;
      const noteItem = noteEditEl.closest('.note-item') as HTMLElement;
      const displayEl = noteItem.querySelector('.note-content-display') as HTMLElement;
      
      // Handle focus - switch to edit mode
      displayEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // If clicking on a link, let it navigate (don't start editing)
        // Check if target is a link or is inside a link
        const linkElement = target.tagName === 'A' ? target : target.closest('a.note-link');
        if (linkElement && linkElement.classList.contains('note-link')) {
          // Don't prevent default - let the link navigate normally
          // Don't stop propagation either - let the browser handle the link
          return;
        }
        // Switch to edit mode only if not clicking on a link
        e.preventDefault();
        e.stopPropagation();
        displayEl.style.display = 'none';
        noteEditEl.style.display = 'block';
        noteEditEl.focus();
        // Place cursor at the end
        const range = document.createRange();
        range.selectNodeContents(noteEditEl);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });

      // Handle blur - save and switch back to display mode
      noteEditEl.addEventListener('blur', () => {
        this.saveNoteContent(noteId, noteEditEl, displayEl);
        noteEditEl.style.display = 'none';
        displayEl.style.display = 'block';
      });

      // Handle paste - strip HTML and keep plain text
      noteEditEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
      });

      // Handle keydown - allow Enter for new lines
      noteEditEl.addEventListener('keydown', (e) => {
        // Allow Enter for new lines - force <br> instead of <div>
        if (e.key === 'Enter') {
          // Prevent default to avoid creating <div> elements
          e.preventDefault();
          
          // Insert a <br> tag using selection API
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);
            // Move cursor after the <br>
            range.setStartAfter(br);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // Fallback: use execCommand
            document.execCommand('insertHTML', false, '<br>');
          }
        }
        // Escape to cancel editing
        if (e.key === 'Escape') {
          noteEditEl.blur();
        }
      });
    });
  }

  private renderNoteContent(rawContent: string, displayElement: HTMLElement): void {
    if (!rawContent.trim()) {
      displayElement.innerHTML = '<span class="note-empty-placeholder">Click to edit...</span>';
      return;
    }

    // Process the content: URLs first, then escape, then markdown
    let processedContent = this.makeUrlsClickable(rawContent);
    processedContent = this.escapeHtmlPreservingLinks(processedContent);
    processedContent = this.processMarkdown(processedContent);
    
    displayElement.innerHTML = processedContent;
  }

  private extractTextWithLineBreaks(element: HTMLElement): string {
    // Extract text content while preserving line breaks from contenteditable
    // In contenteditable divs, line breaks are represented as <div> or <br> tags
    // Get innerHTML and convert HTML line breaks to text newlines
    
    let html = element.innerHTML;
    
    // Replace <br> and <br/> with newlines
    html = html.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace closing and opening div/p tags with newlines
    // Pattern: </div><div>, </p><p>, etc.
    html = html.replace(/<\/div>\s*<div>/gi, '\n');
    html = html.replace(/<\/p>\s*<p>/gi, '\n');
    
    // Replace opening div/p tags (but not closing) - these indicate new lines
    // We need to be careful - only replace if there's content before
    html = html.replace(/([^\n])<div>/gi, '$1\n');
    html = html.replace(/([^\n])<p>/gi, '$1\n');
    
    // Replace closing div/p tags - these also indicate line breaks if followed by content
    html = html.replace(/<\/div>([^\n<])/gi, '\n$1');
    html = html.replace(/<\/p>([^\n<])/gi, '\n$1');
    
    // Now strip all remaining HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up excessive newlines (more than 2 consecutive)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
  }

  private saveNoteContent(noteId: string, editElement: HTMLElement, displayElement: HTMLElement): void {
    const note = this.data.notes.find(n => n.id === noteId);
    if (!note) return;

    // Get the text content with line breaks preserved
    const textContent = this.extractTextWithLineBreaks(editElement);
    
    // Update the note content
    note.content = textContent;
    
    // Re-render the display with processed content
    this.renderNoteContent(note.content, displayElement);
    
    this.saveToStorage();
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: QuickNotesTileData): void {
    this.data = data;
    if (!this.data.notes || this.data.notes.length === 0) {
      this.data.notes = [{
        id: this.generateNoteId(),
        content: 'Made with ❤️ by JonasBaldwin.com.\n\nFork at github.com/jonasbaldwin/pi-splay\n\nSupport my current work in progress at StashBot.app.',
        createdAt: Date.now()
      }];
    }
    this.updateNotes();
  }

  public destroy(): void {
    // Cleanup if needed
  }
}

