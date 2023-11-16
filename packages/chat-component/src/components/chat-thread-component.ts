import { LitElement, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { styles } from '../styles/chat-thread-component.js';

import { globalConfig } from '../config/global-config.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

import iconSuccess from '../../public/svg/success-icon.svg?raw';
import iconCopyToClipboard from '../../public/svg/copy-icon.svg?raw';
import iconQuestion from '../../public/svg/bubblequestion-icon.svg?raw';

import './citation-list.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

export interface ChatActionButton {
  label: string;
  svgIcon: string;
  isDisabled: boolean;
  id: string;
}

@customElement('chat-thread-component')
export class ChatThreadComponent extends LitElement {
  static override styles = [styles];

  @property({ type: Array })
  chatThread: ChatThreadEntry[] = [];

  @property({ type: Array })
  actionButtons: ChatActionButton[] = [];

  @property({ type: Boolean })
  isDisabled = false;

  @property({ type: Boolean })
  isProcessingResponse = false;

  @state()
  isResponseCopied = false;

  @query('#chat-list-footer')
  chatFooter!: HTMLElement;

  // Copy response to clipboard
  copyResponseToClipboard(): void {
    const response = this.chatThread.at(-1)?.text.at(-1)?.value as string;
    navigator.clipboard.writeText(response);
    this.isResponseCopied = true;
  }

  actionButtonClicked(actionButton: ChatActionButton, entry: ChatThreadEntry, event: Event) {
    event.preventDefault();

    const actionButtonClickedEvent = new CustomEvent('on-action-button-click', {
      detail: {
        id: actionButton.id,
        chatThreadEntry: entry,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(actionButtonClickedEvent);
  }

  // debounce dispatching must-scroll event
  debounceScrollIntoView(): void {
    let timeout: any = 0;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (this.chatFooter) {
        this.chatFooter.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  }

  handleCitationClick(citationClickedEvent: Event) {
    this.dispatchEvent(citationClickedEvent);
  }

  handleFollowupQuestionClick(question: string, event: Event) {
    event.preventDefault();
    const citationClickedEvent = new CustomEvent('on-followup-click', {
      detail: {
        question,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(citationClickedEvent);
  }

  renderResponseActions(entry: ChatThreadEntry) {
    return html`
      <div class="chat__header">
        ${this.actionButtons.map(
          (actionButton) => html`
            <button
              title="${actionButton.label}"
              class="button chat__header--button"
              data-testid="chat-action-button-${actionButton.id}"
              @click="${(event: Event) => this.actionButtonClicked(actionButton, entry, event)}"
              ?disabled="${actionButton.isDisabled}"
            >
              <span class="chat__header--span">${actionButton.label}</span>
              ${unsafeSVG(actionButton.svgIcon)}
            </button>
          `,
        )}
        <button
          title="${globalConfig.COPY_RESPONSE_BUTTON_LABEL_TEXT}"
          class="button chat__header--button"
          data-testid="chat-action-button-copy-response"
          @click="${this.copyResponseToClipboard}"
          ?disabled="${this.isDisabled}"
        >
          <span class="chat__header--span"
            >${this.isResponseCopied
              ? globalConfig.COPIED_SUCCESSFULLY_MESSAGE
              : globalConfig.COPY_RESPONSE_BUTTON_LABEL_TEXT}</span
          >
          ${this.isResponseCopied ? unsafeSVG(iconSuccess) : unsafeSVG(iconCopyToClipboard)}
        </button>
      </div>
    `;
  }

  renderTextEntry(textEntry: ChatMessageText) {
    const entries = [html`<p class="chat__txt--entry">${unsafeHTML(textEntry.value)}</p>`];

    // render steps
    if (textEntry.followingSteps && textEntry.followingSteps.length > 0) {
      entries.push(html`
        <ol class="items__list steps">
          ${textEntry.followingSteps.map(
            (followingStep) => html` <li class="items__listItem--step">${unsafeHTML(followingStep)}</li> `,
          )}
        </ol>
      `);
    }
    if (this.isProcessingResponse) {
      this.debounceScrollIntoView();
    }
    return html`<div class="chat_txt--entry-container">${entries}</div>`;
  }

  renderCitation(citations: Citation[] | undefined) {
    if (citations && citations.length > 0) {
      return html`
        <div class="chat__citations">
          <citation-list
            .citations="${citations}"
            .label="${globalConfig.CITATIONS_LABEL}"
            @on-citation-click="${this.handleCitationClick}"
          ></citation-list>
        </div>
      `;
    }

    return '';
  }

  renderFollowupQuestions(followupQuestions: string[] | undefined) {
    // render followup questions
    // need to fix first after decoupling of teaserlist
    if (followupQuestions && followupQuestions.length > 0) {
      return html`
        <div class="items__listWrapper">
          ${unsafeSVG(iconQuestion)}
          <ul class="items__list followup">
            ${followupQuestions.map(
              (followupQuestion) => html`
                <li class="items__listItem--followup">
                  <a
                    class="items__link"
                    href="#"
                    data-testid="followUpQuestion"
                    @click="${(event) => this.handleFollowupQuestionClick(followupQuestion, event)}"
                    >${followupQuestion}</a
                  >
                </li>
              `,
            )}
          </ul>
        </div>
      `;
    }

    return '';
  }

  renderError(error: { message: string }) {
    return html`<p class="chat__txt error">${error.message}</p>`;
  }

  override render() {
    return html`
      <ul class="chat__list" aria-live="assertive">
        ${this.chatThread.map(
          (message) => html`
            <li class="chat__listItem ${message.isUserMessage ? 'user-message' : ''}">
              <div class="chat__txt ${message.isUserMessage ? 'user-message' : ''}">
                ${message.isUserMessage ? '' : this.renderResponseActions(message)}
                ${message.text.map((textEntry) => this.renderTextEntry(textEntry))}
                ${this.renderCitation(message.citations)} ${this.renderFollowupQuestions(message.followupQuestions)}
                ${message.error ? this.renderError(message.error) : ''}
              </div>
              <p class="chat__txt--info">
                <span class="timestamp">${message.timestamp}</span>,
                <span class="user">${message.isUserMessage ? 'You' : globalConfig.USER_IS_BOT}</span>
              </p>
            </li>
          `,
        )}
      </ul>
      <div class="chat__footer" id="chat-list-footer">
        <!-- Do not delete this element. It is used for auto-scrolling -->
      </div>
    `;
  }
}
