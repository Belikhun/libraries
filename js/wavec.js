/**
 * /assets/js/wavec.js
 * 
 * Wave Container.
 * (Very Epic)
 * 
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2022 Belikhun
 */

const wavec = {
	/** @type {HTMLElement} */
	container: undefined,

	/** @type {HTMLElement} */
	layer: undefined,

	/** @type {WaveContainer[]} */
	active: [],

	init(container) {
		if (typeof container !== "object" || !container.classList || !container.parentElement)
			throw { code: -1, description: `wavec.init(): container is not a valid node` }

		this.container = container;
		this.container.classList.add("waveContainer", "hide");

		this.layer = document.createElement("div");
		this.layer.classList.add("layer");
		this.layer.addEventListener("click", () => (this.active.length > 0) ? this.active[this.active.length - 1].hide() : "");

		this.container.appendChild(this.layer);
	}
}

class WaveContainer {
	constructor(content, {
		color = "default",
		icon,
		title,
		full = false
	} = {}) {
		/**
		 * Handlers for toggle event
		 * @type {Array}
		 */
		this.toggleHandlers = []

		/**
		 * Handlers for reload event
		 * @type {Array}
		 */
		this.reloadHandlers = []

		/**
		 * Scrollable instance
		 * @type {Scrollable}
		 */
		this.scrollable = []

		this.container = makeTree("div", ["container", "hide"], {
			wave: { tag: "div", class: "wave", html: `<span></span>`.repeat(4) },

			contentBox: { tag: "div", class: "contentBox", child: {
				loading: new LoadingOverlay(),

				header: { tag: "div", class: "header", child: {
					icon: { tag: "icon" },
					titleNode: { tag: "t", class: "title", text: title || "sample container" },

					buttons: { tag: "span", class: "buttons", child: {
						close: { tag: "icon", class: "close" },
						reload: { tag: "icon", class: "reload" }
					}}
				}},

				content: { tag: "div", class: "content" }
			}}
		});

		if (full)
			this.container.classList.add("full");

		wavec.container.appendChild(this.container);
		this.container.dataset.color = color;

		if (icon || title) {
			this.container.contentBox.header.icon.dataset.icon = icon || "circle";
			this.container.contentBox.header.buttons.close.dataset.icon = "close";
			this.container.contentBox.header.buttons.reload.dataset.icon = "reload";
			this.container.contentBox.header.buttons.reload.style.display = "none";
			
			if (typeof sounds === "object") {
				sounds.applySound(this.container.contentBox.header.buttons.close, ["soundhoversoft", "soundselectsoft"]);
				sounds.applySound(this.container.contentBox.header.buttons.reload, ["soundhoversoft", "soundselectsoft"]);
			}
		} else {
			this.container.contentBox.header.style.display = "none";
		}
		
		if (typeof Scrollable === "function") {
			this.scrollable = new Scrollable(this.container.contentBox, {
				content: this.container.contentBox.content
			});
		}
		
		this.content = content;
		this.showing = false;
		this.stackPos = null;
		this.hideTimeout = null;

		this.container.contentBox.header.buttons.reload.addEventListener("click", () => this.reloadHandlers.forEach(f => f()));
		this.container.contentBox.header.buttons.close.addEventListener("click", () => this.hide());
	}

	set({
		color = undefined,
		icon = undefined,
		title = undefined
	} = {}) {
		if (color)
			this.container.dataset.color = color;

		if (icon) {
			this.container.contentBox.header.icon.dataset.icon = icon;
			this.container.contentBox.header.style.display = null;
		}
		
		if (title) {
			this.container.contentBox.header.titleNode.innerText = title;
			this.container.contentBox.header.style.display = null;
		}
	}

	onToggle(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `WaveContainer().onToggle(): not a valid function` }

		return this.toggleHandlers.push(f);
	}

	onReload(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `WaveContainer().onReload(): not a valid function` }
			
		this.container.contentBox.header.buttons.reload.style.display = null;
		return this.reloadHandlers.push(f);
	}

	/**
	 * @name WaveContainerOnScrollHandler
	 * @function
	 * @global
	 * @param {Event} event	Event
	 */
	
	/**
	 * Attach scroll listener to content box
	 * @param {WaveContainerOnScrollHandler} f 
	 */
	onScroll(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `WaveContainer().onScroll(): not a valid function` }

		this.container.contentBox.content.addEventListener("scroll", (e) => f(e))
	}

	show() {
		if (this.showing)
			return;

		clearTimeout(this.hideTimeout);
		this.showing = true;

		wavec.container.classList.remove("hide");
		this.container.classList.remove("hide");
		this.stackPos = wavec.active.push(this) - 1;
		this.container.style.zIndex = this.stackPos;

		if (typeof sounds === "object")
			sounds.toggle();

		this.toggleHandlers.forEach(f => f(true));
		requestAnimationFrame(() => {
			this.container.classList.add("show");
			wavec.layer.classList.add("show");
		});
	}

	async hide() {
		if (!this.showing)
			return;

		clearTimeout(this.hideTimeout);
		this.showing = false;

		if (typeof sounds === "object")
			sounds.toggle(1);

		await nextFrameAsync();
		this.container.classList.remove("show");
		wavec.active.splice(this.stackPos, 1);

		// Hide the wavec layer if there are no active
		// container left
		if (wavec.active.length === 0)
			wavec.layer.classList.remove("show");

		this.toggleHandlers.forEach(f => f(false));
		this.hideTimeout = setTimeout(() => {
			this.container.classList.add("hide");

			// Hide the wavec container if there are no active
			// container left
			if (wavec.active.length === 0)
				wavec.container.classList.add("hide");
		}, 1050);
	}

	toggle() {
		if (this.showing)
			this.hide();
		else
			this.show();
	}

	setToggler(button) {
		if (button && button.click instanceof navbar.Clickable) {
			button.click.onClick((v) => v ? this.show() : this.hide());
			this.onToggle((v) => button.click.setActive(v));
			return;
		}

		if (!button.container || typeof button.onClick !== "function")
			throw { code: -1, description: `WaveContainer.setToggler(): not a valid Button` }

		button.onClick((a) => a ? this.show() : this.hide());
	}

	/**
	 * @param {String | Node} content
	 */
	set content(content) {
		emptyNode(this.container.contentBox.content);

		if (typeof content === "object" && content.classList)
			this.container.contentBox.content.appendChild(content);
		else
			this.container.contentBox.content.innerHTML = content;
	}

	/**
	 * @param {Boolean} loading
	 */
	set loading(loading) {
		this.container.contentBox.loading.loading = loading;
	}

	/**
	 * @returns {HTMLDivElement}
	 */
	get content() {
		return this.container.contentBox.content;
	}
}