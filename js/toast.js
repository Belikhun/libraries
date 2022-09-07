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
 * @copyright	2018-2022 Belikhun
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

		// Only show if there is no active toast.
		if (!this.showing)
			await instance.show();
		else
			instance.queue();
		
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
	 * @param	{String}	value
	 */
	set value(value) {
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
		this.light = light;
		this.duration = duration;
		this.showing = false;
		this.timeout = null;
		this.showListeners = []
		this.hideListeners = []

		if (typeof value === "boolean") {
			this.light = value;
			this.value = value ? "bật" : "tắt";
		} else {
			this.value = value;
		}
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
		toast.instances.push(this);
	}

	async show() {
		toast.title = this.title;
		toast.value = this.value;
		toast.light = this.light;
		toast.hint = this.hint;
		toast.active = this;
		toast.instances.splice(toast.instances.indexOf(this), 1);
		this.showing = true;

		if (!toast.showing) {
			toast.showing = true;

			toast.view.classList.remove("hide");
			await nextFrameAsync();
			toast.view.classList.add("show");
			await delayAsync(500);
		}

		if (this.duration > 0) {
			// Add timeout to automatically hide this toast
			this.timeout = setTimeout(() => this.hide(), this.duration);
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

	async hide() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}

		this.showing = false;

		if (toast.showing) {
			toast.active = undefined;
			toast.showing = false;

			toast.view.classList.remove("show");
			await delayAsync(1500);
			toast.view.classList.add("hide");
		}

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