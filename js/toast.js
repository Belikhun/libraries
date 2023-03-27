/**
 * /assets/js/toast.js
 * 
 * Toast notification API.
 * 
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

const toast = {
	/** @type {ToastInstance[]} */
	instances: [],

	/** @type {ToastInstance} */
	active: undefined,

	/** @type {TreeDOM} */
	view: undefined,

	showing: false,

	/**
	 * Initialize toast inside a container
	 * @param	{HTMLElement}	container
	 */
	init(container = document.body) {
		if (!this.view) {
			this.view = makeTree("div", ["toast", "hide"], {
				value: { tag: "div", class: "value", text: "value" },
				top: { tag: "div", class: "top", child: {
					titleNode: { tag: "div", class: "title", text: "sample" },
					space: { tag: "div", class: "space" }
				}},
	
				bottom: { tag: "div", class: "bottom", child: {
					space: { tag: "div", class: "space" },
					light: { tag: "div", class: "light" },
					hint: { tag: "div", class: "hint", text: "no hint yet" }
				}}
			});
		}

		container.insertBefore(this.view, container.childNodes[0]);
	},

	/**
	 * Construct a new Toast Instance
	 * @param	{String}				title 
	 * @param	{String|Boolean}		value 
	 * @param	{{
	 * 	hint: String
	 * 	light: Boolean|null
	 * 	duration: Number
	 * }} [options]
	 * @return	{Promise<ToastInstance>}
	 */
	async show(title, value, options = {}) {
		let instance = new ToastInstance(title, value, options);
		instance.show();		
		return instance;
	},

	/**
	 * Update toast title
	 * @param	{String}	title
	 */
	set title(title) {
		this.view.top.titleNode.innerText = title;
	},

	/**
	 * Update toast value
	 * @param	{String|Boolean}	value
	 */
	set value(value) {
		if (typeof value === "boolean") {
			this.light = value;
			value = value ? "bật" : "tắt";
		}

		this.view.value.classList[value.length > 6 ? "add" : "remove"]("small");
		this.view.value.innerText = value;
	},

	/**
	 * Update toast light state
	 * @param	{Boolean|null}	light
	 */
	set light(light) {
		if (typeof light === "boolean") {
			this.view.bottom.light.classList.add("show");
			this.view.bottom.light.classList[light ? "add" : "remove"]("active");
		} else {
			this.view.bottom.light.classList.remove("show");
		}
	},

	/**
	 * Update hint value
	 * @param	{String}	hint
	 */
	set hint(hint) {
		this.view.bottom.hint.innerText = hint;
	},
}

class ToastInstance {
	/**
	 * Construct a new Toast Instance
	 * @param	{String}				title 
	 * @param	{String|Boolean}		value 
	 * @param	{{
	 * 	hint: String
	 * 	light: Boolean|null
	 * 	duration: Number
	 * }} [options]
	 */
	constructor(title, value, {
		hint = "no hint",
		light = null,
		duration = 3000
	} = {}) {
		this.title = title;
		this.hint = hint;
		this.value = value;
		this.light = light;
		this.duration = duration;
		this.showing = false;
		this.timeout = null;
		this.showListeners = []
		this.hideListeners = []

		clog("DEBG", `ToastInstance("${this.title}"): created new toast instance!`);
	}

	/**
	 * Listen for toast show event.
	 * @param {(instance: ToastInstance) => any|Promise}	f 
	 */
	onShow(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `ToastInstance("${this.title}").onShow(): not a valid function!` }
	
		return this.showListeners.push(f) - 1;
	}

	/**
	 * Listen for toast hide event.
	 * @param {(instance: ToastInstance) => any|Promise}	f 
	 */
	onHide(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `ToastInstance("${this.title}").onHide(): not a valid function!` }
	
		return this.hideListeners.push(f) - 1;
	}

	queue() {
		if (toast.instances.includes(this))
			return;

		toast.instances.push(this);
		clog("DEBG", `ToastInstance("${this.title}").queue(): added to queue!`);
	}

	async show() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}

		// Queue this toast if there is another one showing.
		if (toast.showing && toast.active !== this) {
			this.queue();
			return;
		}

		toast.title = this.title;
		toast.value = this.currentValue;
		toast.light = this.currentLight;
		toast.hint = this.hint;
		toast.active = this;

		if (this.duration > 0) {
			// Add timeout to automatically hide this toast
			this.timeout = setTimeout(() => this.hide(), this.duration);
		}

		if (this.showing)
			return;

		this.showing = true;
		clog("DEBG", `ToastInstance("${this.title}").show(): showing!`);

		if (toast.instances.includes(this))
			toast.instances.splice(toast.instances.indexOf(this), 1);

		if (!toast.showing) {
			toast.showing = true;

			toast.view.classList.remove("hide");
			await nextFrameAsync();
			toast.view.classList.add("show");
			await delayAsync(500);
		}

		// Fire listeners
		for (let f of this.showListeners) {
			try {
				await f(this);
			} catch(e) {
				clog("WARN", `ToastInstance("${this.title}").show(): listener generated an error!`, e);
				continue;
			}
		}
	}

	/**
	 * Set toast value
	 * @param	{Boolean|String}	value
	 */
	set value(value) {
		if (typeof value === "boolean") {
			this.currentLight = value;
			this.currentValue = value ? "bật" : "tắt";
		} else {
			this.currentValue = value;
			this.currentLight = null;
		}

		if (toast.active !== this)
			return;

		toast.value = value;
		toast.light = this.currentLight;
	}

	/**
	 * Set toast light
	 * @param	{Boolean|null}	light
	 */
	set light(light) {
		this.currentLight = light;

		if (toast.active !== this)
			return;

		toast.light = light;
	}

	async hide() {
		if (!this.showing)
			return;

		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}

		clog("DEBG", `ToastInstance("${this.title}").hide(): hiding!`);

		if (toast.showing) {
			toast.view.classList.remove("show");
			await delayAsync(1500);
			toast.view.classList.add("hide");
			
			toast.active = undefined;
			toast.showing = false;
		}

		this.showing = false;

		// Fire listeners
		for (let f of this.hideListeners) {
			try {
				await f(this);
			} catch(e) {
				clog("WARN", `ToastInstance("${this.title}").hide(): listener generated an error!`, e);
				continue;
			}
		}

		if (toast.instances.length > 0) {
			// Show next toast in queue
			toast.instances[0].show();
		}
	}

	/**
	 * Attach to this toast instance that will resolve on hide.
	 * @returns	{Promise}
	 */
	attach() {
		if (!this.showing)
			return;

		return new Promise((resolve) => this.onHide(() => resolve()));
	}
}