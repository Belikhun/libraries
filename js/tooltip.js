/**
 * /assets/js/tooltip.js
 * 
 * Provide tooltip for the cursor when hovering over some elements.
 * You can register a custom hook to show your custom data.
 * 
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2022 Belikhun
 */

const tooltip = {
	/**
	 * @typedef {{
	 * 	target: HTMLElement
	 * 	value: String
	 * 	update: Function
	 * }} TooltipHookHandlerOptions
	 * 
	 * @typedef {{
	 * 	on: "dataset" | "attribute"
	 * 	key: String
	 * 	handler(options: TooltipHookHandlerOptions): String
	 * 	destroy()
	 * 	priority: Number
	 * 	noPadding: Boolean
	 * }} TooltipHook
	 */

	initialized: false,
	container: HTMLDivElement.prototype,
	content: HTMLDivElement.prototype,
	prevData: null,
	hideTimeout: null,
	fixedWidth: false,
	showing: false,
	showTime: 100,
	scanDelay: 500,
	
	/** @type {HTMLElement} */
	nodeToShow: null,

	/** @type {TooltipHook[]} */
	hooks: [],
	
	/** @type {TooltipHook} */
	__currentHook: null,

	__sizeObserving: false,
	__wait: false,
	__scanTimeout: undefined,

	processor: {
		dataset: {
			/**
			 * Build-in element's dataset value processor
			 * 
			 * @param	{HTMLElement}	target		Target element
			 * @param	{String}		key			Key to get value from
			 * @returns	{String|null}				Return value
			 */
			process(target, key) {
				if (typeof target.dataset[key] === "string")
					return target.dataset[key];
	
				return null;
			},

			/**
			 * Scan for targets and attach event listener
			 * with specified hook
			 * 
			 * @param	{TooltipHook}	hook	Hook to scan for elements
			 * @param	{HTMLElement}	target	Target to scan for elements
			 */
			attach(hook, target) {
				let targets = (target || document)
					.querySelectorAll(`[data-${hook.key}]:not([data-tooltip-checked])`);

				for (let target of targets)
					tooltip.attachEvent(target, hook);
			}
		},

		attribute: {
			/**
			 * Build-in element's dataset value processor
			 * 
			 * @param	{HTMLElement}	target		Target element
			 * @param	{String}		key			Key to get value from
			 * @returns	{String|null}				Return value
			 */
			process(target, key) {
				return target.getAttribute(key);
			},

			/**
			 * Scan for targets and attach event listener
			 * with specified hook
			 * 
			 * @param	{TooltipHook}	hook	Hook to scan for elements
			 * @param	{HTMLElement}	target	Target to scan for elements
			 */
			attach(hook, target) {
				let targets = (target || document)
					.querySelectorAll(`[${hook.key}]:not([data-tooltip-checked])`);

				for (let target of targets)
					tooltip.attachEvent(target, hook);
			}
		}
	},

	/**
	 * Initialize tooltip module
	 * @param	{HTMLElement}	[container]		Container to watch for tooltip elements
	 */
	init(container) {
		// Check mobile phone
		if (checkAgentMobile()) {
			clog("WARN", "tooltip: this module will be disabled on mobile device due to performance reason. Initialize aborted.");
			return false;
		}

		this.container = document.createElement("div");
		this.container.classList.add("tooltip", "hide");
		this.content = document.createElement("div");
		this.content.classList.add("content");
		this.content.setAttribute("style", "");
		this.container.append(this.content);

		document.body.insertBefore(this.container, document.body.childNodes[0]);

		//* EVENTS
		new MutationObserver((records) => {
			clearTimeout(this.__scanTimeout);
			this.__scanTimeout = setTimeout(() => this.scan(), this.scanDelay);
		}).observe(container || document.body, {
			childList: true,
			subtree: true,
			attributes: false
		});

		if (typeof ResizeObserver === "function") {
			new ResizeObserver(() => {
				this.container.style.width = this.content.clientWidth + "px";
				this.container.style.height = this.content.clientHeight + "px";
			}).observe(this.content);

			this.__sizeObserving = true;
		}

		//* BUILT IN HOOKS
		this.addHook({
			on: "dataset",
			key: "tip"
		});

		this.addHook({
			on: "attribute",
			key: "tooltip"
		});

		this.addHook({
			on: "attribute",
			key: "title",
			handler: ({ target, value }) => {
				let actualValue = target.getAttribute("tooltip");

				// Little hack to disable browser's default tooltip.
				// After this hack, value passed to this handler will be null, so we
				// get value directly from tooltip attribute
				if (!actualValue) {
					target.setAttribute("tooltip", value);
					target.removeAttribute("title");
					actualValue = value;
				}

				return actualValue;
			}
		});

		this.initialized = true;
	},

	/**
	 * Register a new hook
	 * @param {TooltipHook} options 
	 */
	addHook({
		on = null,
		key = null,
		handler = ({ target, value, update }) => value,
		destroy = () => {},
		priority = 1,
		noPadding = false
	} = {}) {
		if (typeof on !== "string" || typeof this.processor[on] !== "object")
			throw { code: -1, description: `tooltip.addHook(): \"on\": unexpected '${on}', expecting 'dataset'/'attribute'` }

		if (typeof key !== "string")
			throw { code: -1, description: `tooltip.addHook(): \"key\" is not a valid string` }

		if (typeof handler !== "function")
			throw { code: -1, description: `tooltip.addHook(): \"handler\" is not a valid function` }

		if (typeof destroy !== "function")
			throw { code: -1, description: `tooltip.addHook(): \"destroy\" is not a valid function` }

		if (typeof priority !== "number")
			throw { code: -1, description: `tooltip.addHook(): \"priority\" is not a valid number` }

		if (typeof noPadding !== "boolean")
			throw { code: -1, description: `tooltip.addHook(): \"noPadding\" is not a valid boolean` }

		let hook = { on, key, handler, destroy, priority, noPadding };
		this.hooks.push(hook);
		this.hooks.sort((a, b) => (a.priority < b.priority) ? 1 : (a.priority > b.priority) ? -1 : 0);

		// Scan document for existing element with tooltip
		this.processor[on].attach(hook);
	},

	/**
	 * Perform a full scan for element with tooltip
	 * data need to show
	 * @param	{HTMLElement}	[target]
	 */
	scan(target) {
		for (let hook of this.hooks)
			this.processor[hook.on].attach(hook, target);
	},

	/**
	 * Try to get value from target with specified hook
	 * 
	 * @param	{HTMLElement}	target
	 * @param	{TooltipHook}	hook
	 * @returns	{String|null}
	 */
	getValue(target, hook) {
		if (!target.style || !target.tagName)
			return null;

		if (typeof this.processor[hook.on] !== "object")
			return null;

		return this.processor[hook.on].process(target, hook.key);
	},

	/**
	 * Attach tooltip mouse event to Element (if possible)
	 * @param	{HTMLElement}		target
	 * @param	{TooltipHook}		hook	Hook to try attach to
	 */
	attachEvent(target, hook) {
		let hooks = (typeof hook === "object")
			? [ hook ]
			: this.hooks;

		// Check for hook that match current target
		for (let hook of hooks) {
			if (this.getValue(target, hook) === null)
				continue;

			if (target.dataset.tooltipListening) {
				clog("DEBG", `tooltip.attachEvent(${hook.on} ${hook.key}): target already listening`, target);
				break;
			}

			target.addEventListener("mouseenter", () => {
				let value = this.getValue(target, hook);
				let showValue = hook.handler({
					target,
					value,
					update: (data) => this.update(data)
				});

				if (showValue)
					this.show(showValue, target, hook.noPadding, hook);
			});

			target.dataset.tooltipListening = true;
			// clog("DEBG", `tooltip.attachEvent(${hook.on} ${hook.key}): event attached to`, target);
			break;
		}

		target.dataset.tooltipChecked = true;
	},

	/**
	 * Mouse move handler to update tooltip position
	 * @param	{MouseEvent}	event		Mouse Event
	 * @param	{Boolean}		forceUpdate	Force Update The Position Without Checking
	 */
	mouseMove(event, forceUpdate = false) {
		if (!forceUpdate && this.container.classList.contains("hide"))
			return;

		let maxX = window.innerWidth - this.content.clientWidth - 15;
		let xPos = Math.min(event.clientX + 10, maxX);
		let yPos = event.clientY + 15;

		this.container.style.transform = `translate(${xPos}px, ${yPos}px)`;
	},

	__mouseMove: (e) => {
		if (!tooltip.__wait) {
			tooltip.__wait = true;
			tooltip.mouseMove(e);

			setTimeout(() => tooltip.__wait = false, 50);
		}
	},

	__mouseLeave: () => tooltip.hide(),

	/**
	 * Show the tooltip on node
	 * 
	 * @param {String|Object}	data			Text/Element to show
	 * @param {HTMLElement}		showOnNode		Node to show text on
	 * @param {Boolean}			noPadding		Remove padding around tooltip
	 * @param {Object}			hook			Hook called this function, for calling destroy handler
	 * @returns 
	 */
	async show(data, showOnNode, noPadding = false, hook = null) {
		if (!this.initialized)
			return false;

		if (this.nodeToShow)
			this.nodeToShow.removeEventListener("mouseleave", this.__mouseLeave);
		
		if (showOnNode && showOnNode.tagName) {
			this.nodeToShow = showOnNode;
			this.nodeToShow.addEventListener("mouseleave", this.__mouseLeave);
		}

		clearTimeout(this.hideTimeout);
		this.hideTimeout = null;
		
		if (!this.showing) {
			window.addEventListener("mousemove", this.__mouseMove, { passive: true });
			this.mouseMove({ clientX: mouseCursor.x, clientY: mouseCursor.y }, true);
			
			// Await next frame to apply position change
			// of tooltip
			await nextFrameAsync();
		}

		this.container.classList.remove("hide");
		this.showing = true;
		this.fixedWidth = false;

		await nextFrameAsync();
		this.container.classList.add("show");
		this.content.dataset.noPadding = noPadding;

		this.__currentHook = hook;
		this.update(data);
		return true;
	},

	/**
	 * Change tooltip content
	 * 
	 * @param {String|Object|HTMLElement}	data	Data to be shown
	 */
	update(data) {
		switch (typeof data) {
			case "object":
				if (data.classList && data.dataset) {
					emptyNode(this.content);
					this.content.append(data);
					break;
				}

				this.content.innerText = JSON.stringify(data, null, 4);
				break;

			default:
				this.content.innerHTML = data;
				break;
		}

		//? TRIGGER REFLOW TO REPLAY ANIMATION
		this.container.style.animation = "none";
		requestAnimationFrame(() => {
			this.container.style.animation = null;

			if (!this.__sizeObserving) {
				this.container.style.width = this.content.clientWidth + "px";
				this.container.style.height = this.content.clientHeight + "px";
			}
		});
	},

	async hide() {
		// Destroy active hook
		if (tooltip.__currentHook) {
			tooltip.__currentHook.destroy();
			tooltip.__currentHook = null;
		}

		if (!this.hideTimeout)
			this.hideTimeout = setTimeout(() => {
				if (this.nodeToShow)
					this.nodeToShow.removeEventListener("mouseleave", this.__mouseLeave);

				this.nodeToShow = null;
				this.prevData = null;
				this.container.classList.remove("show");

				this.hideTimeout = setTimeout(() => {
					this.container.classList.add("hide");
					this.fixedWidth = false;
					this.content.style.width = null;

					window.removeEventListener("mousemove", this.__mouseMove);
					this.showing = false;
				}, 300);
			}, this.showTime);
	}
}