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
	instances: [],

	/** @type {TreeDOM} */
	view: undefined,

	init(container = document.body) {
		this.view = makeTree("div", "toast", {
			value: { tag: "div", class: "value", text: "value" },
			top: { tag: "div", class: "top", child: {
				titleNode: { tag: "div", class: "title", text: "sample" }
			}},

			bottom: { tag: "div", class: "bottom", child: {
				bean: { tag: "div", class: "bean" },
				hint: { tag: "div", class: "hint", text: "no hint yet" }
			}}
		});

		container.insertBefore(this.view, container.childNodes[0]);
	}
}

class ToastInstance {

}