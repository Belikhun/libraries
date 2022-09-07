/**
 * /assets/tests/scenes/toast.js
 * 
 * library's toast notification testing scene.
 * Scene will be loaded before tests framework and
 * wrapper for integration before scanning.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2022 Belikhun
 */

/** @type {ScenesTree} */
tests.scenes.toast = {
	name: "Toast",
	classes: "dark",

	activate(scene) {
		toast.init(scene.field);
	},

	basic: {
		name: "Basic Tests",

		async show() {
			await toast.show("sample", "value!");
		},

		"light on"() {
			toast.light = true;
		},

		"light off"() {
			toast.light = false;
		},

		"light hide"() {
			toast.light = null;
		},

		"change to a lengthy value"() {
			toast.value = "this is a very loooong value";
		},

		"toast width is greater than 240"(step) {
			step.AssertIs("width > 240", toast.view.clientWidth > 240);
		},

		async hide() {
			await toast.active.hide();
		}
	},

	queues: {
		name: "Queue Tests",

		async "toast 1"() {
			await toast.show("toast 1", "yea", { duration: 1000 });
		},

		async "toast 2"() {
			await toast.show("toast 2", "nice", { duration: 1000 });
		},

		async "toast 3"() {
			await toast.show("toast 3", "teehee", {
				duration: 1000,
				hint: "dis a hint?",
				light: true
			});
		},

		"queue should have 2 toasts"(step) {
			step.AssertEqual("queue length", toast.instances.length, 2);
		},

		async "wait toast 1 to hide"() {
			await toast.active.attach();
		},

		"toast 2 should be showing"(step) {
			step.AssertEqual("active toast", toast.active.title, "toast 2");
		},

		"queue should have 1 toasts"(step) {
			step.AssertEqual("queue length", toast.instances.length, 1);
		},

		async "wait toast 2 to hide"() {
			await toast.active.attach();
		},

		"toast 3 should be showing"(step) {
			step.AssertEqual("active toast", toast.active.title, "toast 3");
		},

		"queue should be empty"(step) {
			step.AssertEqual("queue length", toast.instances.length, 0);
		},

		async "wait toast 3 to hide"() {
			await toast.active.attach();
		},

		"toast should not visible anymore"(step) {
			step.AssertIs("toast hide", !toast.showing);
			step.AssertIs("toast no active", !toast.active);
			step.AssertIs("toast view hide", toast.view.classList.contains("hide"));
		}
	}
}