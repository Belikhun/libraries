/**
 * /assets/js/navbar.js
 * 
 * Navbar and navbar's component.
 * 
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

const navbar = {
	/** @type {HTMLElement} */
	container: undefined,

	block: {
		/** @type {HTMLElement} */
		left: undefined,

		/** @type {HTMLElement} */
		middle: undefined,

		/** @type {HTMLElement} */
		right: undefined
	},

	tooltip: {
		/** @type {HTMLElement} */
		container: undefined,

		/** @type {HTMLElement} */
		title: undefined,

		/** @type {HTMLElement} */
		description: undefined
	},

	/** @type {HTMLElement} */
	underlay: undefined,

	instances: [],
	subWindowLists: [],

	init(container) {
		if (typeof container !== "object" || !container.classList)
			throw { code: -1, description: `navbar.init(): container is not a valid node` }

		this.container = container;
		this.container.classList.add("navigationBar");
		emptyNode(this.container);

		for (let key of Object.keys(this.block)) {
			this.block[key] = document.createElement("span");
			this.block[key].classList.add("group", key);
			this.container.appendChild(this.block[key]);
		}

		if (!this.tooltip.container) {
			this.tooltip.container = document.createElement("div");
			this.tooltip.container.classList.add("navTip");
			this.tooltip.title = document.createElement("t");
			this.tooltip.title.classList.add("title");
			this.tooltip.description = document.createElement("t");
			this.tooltip.description.classList.add("description");
			this.tooltip.container.append(this.tooltip.title, this.tooltip.description);
		}

		if (!this.underlay) {
			this.underlay = document.createElement("div");
			this.underlay.classList.add("underlay");

			this.underlay.addEventListener("click", () => {
				for (let item of this.subWindowLists)
					item.hide(false);
	
				this.setUnderlay(false);
			});

			// I don't want to add duplicate event listener
			// so just putting here to make sure it only fire
			// once
			window.addEventListener("resize", () => {
				for (let item of this.subWindowLists)
					if (item.showing)
						item.update();
			});
		}

		this.container.append(this.tooltip.container, this.underlay);
	},

	/**
	 * Insert navbar's component into a specific location on the navbar
	 * @param	{Object}						component
	 * @param	{"left" | "right" | "center"}	location 
	 * @param	{Number}						order 
	 */
	insert(component, location, order) {
		if (this.instances.includes(component))
			return;

		if (typeof component !== "object" || !component.container)
			throw { code: -1, description: `navbar.insert(): not a valid component` }

		if (!this.block[location])
			throw { code: -1, description: `navbar.insert(): not a valid location` }

		this.block[location].appendChild(component.container);
		this.instances.push(component);

		if (typeof order === "number")
			component.container.style.order = order;
	},

	remove(component, location) {
		if (typeof component !== "object" || !component.container)
			throw { code: -1, description: `navbar.insert(): not a valid component` }

		if (!this.block[location])
			throw { code: -1, description: `navbar.insert(): not a valid location` }

		this.block[location].removeChild(component.container);
	},

	setUnderlay(visible = false) {
		this.underlay.classList[visible ? "add" : "remove"]("show");
	},

	Tooltip: class {
		constructor(node, {
			title = null,
			description = null
		} = {}) {
			this.node = node;
			this.locked = false;
			this.disabled = false;
			this.tooltip = navbar.tooltip;
			this.title = title;
			this.description = description;
			this.showing = false;

			node.addEventListener("mouseenter", () => {
				if (this.locked || this.disabled || !this.title || !this.description || node.classList.contains("active"))
					return;

				this.show();
			});

			node.addEventListener("click", () => {
				this.hide();
				this.locked = true;
			});

			node.addEventListener("mouseleave", () => {
				this.hide();
				this.locked = false;
			});
		}

		show() {
			let contPos = navbar.container.getBoundingClientRect();
			let leftPos = this.node.getBoundingClientRect().left - contPos.left;
			let rightPos = leftPos + this.node.offsetWidth;

			if ((rightPos / navbar.container.clientWidth) > 0.8) {
				this.tooltip.container.classList.add("flip");
				this.tooltip.container.style.left = null;
				this.tooltip.container.style.right =
					`${navbar.container.clientWidth - rightPos}px`;
			} else {
				this.tooltip.container.classList.remove("flip");
				this.tooltip.container.style.left = `${leftPos}px`;
				this.tooltip.container.style.right = null;
			}

			this.tooltip.title.innerText = this.title;
			this.tooltip.description.innerText = this.description;
			this.tooltip.container.classList.add("show");
			this.showing = true;
		}

		hide() {
			this.tooltip.container.classList.remove("show");
			this.showing = false;
		}

		set({
			title = null,
			description = null
		}) {
			if (title)
				this.title = title;

			if (description)
				this.description = description;
		}
	},

	SubWindow: class {
		/**
		 * @param {HTMLElement}				container 
		 * @param {HTMLElement|String}		content 
		 * @param {String}					color 
		 */
		constructor(container, content = "BLANK", color = "gray") {
			this.id = randString(6);
			this.showing = false;
			this.hideTimeout = null;
			this.toggleHandlers = [];
			this.container = container;

			this.windowNode = document.createElement("div");
			this.windowNode.classList.add("subWindow", "hide");
			this.windowNode.dataset.id = this.id;
			this.color = color;

			this.overlay = new LoadingOverlay();

			this.contentNode = document.createElement("div");
			this.contentNode.classList.add("content");
			this.content = content;

			new ResizeObserver(() => this.update()).observe(this.contentNode);
	
			this.windowNode.append(this.overlay.container, this.contentNode);
			this.container.appendChild(this.windowNode);
			navbar.subWindowLists.push(this);
		}

		update() {
			let height = (this.showing) ? this.contentNode.offsetHeight : 0;
			this.windowNode.style.height = `${height}px`;
			
			if (this.showing) {
				let containerRect = this.container.getBoundingClientRect();
				let width = this.contentNode.offsetWidth;
				let leftPos = containerRect.left;
	
				if ((leftPos + (containerRect.width / 2) + (width / 2)) <= window.innerWidth && (leftPos + (containerRect.width / 2) > (width / 2)))
					this.windowNode.dataset.align = "center";
				else if ((width - (leftPos + containerRect.width)) < 0)
					this.windowNode.dataset.align = "right";
				else if ((leftPos + width) <= window.innerWidth)
					this.windowNode.dataset.align = "left";
				else {
					this.windowNode.dataset.align = "full";
					this.windowNode.style.width = null;
					return;
				}
	
				this.windowNode.style.width = `${width}px`;
			}
		}

		show() {
			clearTimeout(this.hideTimeout);

			for (let item of navbar.subWindowLists)
				if (item.id !== this.id)
					item.hide(false);

			if (typeof sounds === "object")
				sounds.toggle()

			navbar.setUnderlay(true);
			this.windowNode.classList.remove("hide");
			this.windowNode.classList.add("show");
			this.container.classList.add("active");

			this.showing = true;
			this.update();
		}

		hide(trusted = true) {
			clearTimeout(this.hideTimeout);

			if (trusted) {
				if (typeof sounds === "object")
					sounds.toggle(1)

				navbar.setUnderlay(false);
			}

			this.windowNode.classList.remove("show");
			this.container.classList.remove("active");

			this.showing = false;
			this.update();

			this.hideTimeout = setTimeout(() => this.windowNode.classList.add("hide"), 300);
		}

		toggle() {
			(this.showing) ? this.hide() : this.show();
			this.toggleHandlers.forEach((f) => f(this.showing));
		}

		onToggle(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `navbar.SubWindow().onToggle(): not a valid function` }

			return this.toggleHandlers.push(f);
		}

		/**
		 * Set window color
		 * @param {String} color
		 */
		set color(color) {
			this.windowNode.dataset.color = color;
		}

		/**
		 * @param {Boolean} loading
		 */
		set loading(loading) {
			this.overlay.loading = loading;
		}

		/**
		 * @param {String|Element} content
		 */
		set content(content) {
			if (typeof content === "object" && content.classList) {
				emptyNode(this.contentNode);
				this.contentNode.appendChild(content);
			} else
				this.contentNode.innerHTML = content;
		}
	},

	Clickable: class {
		constructor(container, { onlyActive = false } = {}) {
			if (typeof container !== "object" || !container.appendChild)
				throw { code: -1, description: `navbar.Clickable(): container is not a valid node` }

			this.container = container;
			this.container.classList.add("clickable");
			this.clickHandlers = []
			this.handlers = []

			this.clickBox = document.createElement("div");
			this.clickBox.classList.add("clickBox");
			this.clickBox.addEventListener("click", () => {
				if (onlyActive) {
					for (let f of this.clickHandlers)
						f(true);

					this.active = true;
				} else {
					let isActive = this.container.classList.contains("active");
					
					for (let f of this.clickHandlers)
						f(!isActive);

					this.toggle(isActive);
				}
			});

			if (typeof sounds === "object")
				sounds.applySound(this.clickBox, ["soundhover", "soundselect"]);

			this.container.appendChild(this.clickBox);
		}

		onClick(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `navbar.Clickable.onClick(): not a valid function` }

			return this.clickHandlers.push(f);
		}

		setHandler(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `navbar.Clickable.setHandler(): not a valid function` }

			return this.handlers.push(f);
		}

		removeHandler(index) {
			if (this.handlers[index])
				this.handlers[index] = undefined;
		}

		/**
		 * Set Clickable Button State
		 * @param {Boolean}		active
		 */
		set active(active) {
			this.setActive(active);

			requestAnimationFrame(() => {
				for (let item of this.handlers) {
					if (typeof item === "function")
						item(active);
				}
			});
		}

		/**
		 * Get Clickable Button State
		 * @return {Boolean}
		 */
		get active() {
			return this.container.classList.contains("active");
		}

		show() {
			this.active = true;
		}

		hide() {
			this.active = false;
		}

		/**
		 * Set Active State Without Triggering Event Handlers
		 * @param	{Boolean}	active
		 */
		setActive(active) {
			this.container.classList[active ? "add" : "remove"]("active")
		}

		/**
		 * Toogle Active State
		 * @param	{Boolean}	isActive
		 */
		toggle(isActive = this.active) {
			this.active = !isActive;
		}
	},

	//? NAVIGATION BAR COMPONENTS

	title({
		icon = "/api/images/icon",
		title = "App Name"
	} = {}) {
		let container = document.createElement("span");
		container.classList.add("component", "title");

		let iconNode = new lazyload({
			source: icon,
			classes: "icon"
		});

		let titleNode = document.createElement("t");
		titleNode.classList.add("title");
		titleNode.innerHTML = title;

		container.append(iconNode.container, titleNode);

		let navtip = new this.Tooltip(
			container,
			(arguments && arguments[0] && arguments[0].tooltip)
				? arguments[0].tooltip
				: {}
		);

		let click = new this.Clickable(container);

		return {
			container,
			tooltip: navtip,
			click,

			set({
				icon,
				title,
			}) {
				if (icon)
					iconNode.src = icon;

				if (title)
					titleNode.innerText = title;
			}
		}
	},

	iconButton({
		icon = "circle",
		color = document.body.classList.contains("dark") ? "dark" : "whitesmoke"
	} = {}) {
		let container = document.createElement("span");
		container.classList.add("component", "iconBtn");

		let iconNode = document.createElement("icon");
		iconNode.dataset.icon = icon;

		container.appendChild(iconNode);
		let background = triBg(container, { color, scale: 1, triangleCount: 8, speed: 6 });

		let navtip = new this.Tooltip(
			container,
			(arguments && arguments[0] && arguments[0].tooltip)
				? arguments[0].tooltip
				: {}
		);
		let click = new this.Clickable(container);

		return {
			container,
			navtip,
			click,

			set({
				icon,
				color
			} = {}) {
				if (icon)
					iconNode.dataset.icon = icon;

				if (color)
					background.setColor(color);
			}
		}
	},

	menuButton({} = {}) {
		let container = document.createElement("span");
		container.classList.add("component", "menuBtn");

		let iconNode = document.createElement("span");
		iconNode.classList.add("hamburger");
		iconNode.innerHTML = `<span></span><span></span><span></span>`

		container.appendChild(iconNode);

		let navtip = new this.Tooltip(
			container,
			(arguments && arguments[0] && arguments[0].tooltip)
				? arguments[0].tooltip
				: {}
		);

		let click = new this.Clickable(container);

		return {
			container,
			tooltip: navtip,
			click
		}
	},

	switch({
		color = document.body.classList.contains("dark") ? "dark" : "whitesmoke"
	} = {}) {
		let container = document.createElement("span");
		container.classList.add("component", "switch");

		let indicator = document.createElement("div");
		indicator.classList.add("indicator");
		container.appendChild(indicator);

		let background = triBg(container, { color, scale: 2, triangleCount: 8, speed: 6 });
		let currentActive = null;

		return {
			container,

			button({
				icon = "circle"
			} = {}) {
				let button = document.createElement("icon");
				button.dataset.icon = icon;
				button.dataset.id = randString(4);

				let navtip = new navbar.Tooltip(
					button,
					(arguments && arguments[0] && arguments[0].tooltip)
						? arguments[0].tooltip
						: {}
				);

				let click = new navbar.Clickable(button, { onlyActive: true });

				/**
				 * Update current active button without triggering
				 * event handlers
				 */
				const update = () => {
					if (currentActive && currentActive.id !== button.dataset.id) {
						currentActive.click.active = false;
						currentActive = null;
					}

					indicator.style.left = button.offsetLeft + "px";
					currentActive = { id: button.dataset.id, click }
				}

				click.setHandler((a) => {
					if (a)
						update();
				});

				container.appendChild(button);

				return {
					button,
					navtip,
					click,
					update
				}
			},

			set({
				color = null
			} = {}) {
				if (color)
					background.setColor(color);
			}
		}
	}
}