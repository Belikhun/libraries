/**
 * /assets/js/scrollable.js
 *
 * Provide Smooth Scrolling and Custom Scrollbar.
 *
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 *
 * @author		Belikhun
 * @version		2.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

class Scrollable {
	/**
	 * Provide Smooth Scrolling and Custom Scrollbar.
	 *
	 * @param	{HTMLElement}		container				Container where the scrollbar will live in.
	 * @param	{Object}			options
	 * @param	{HTMLElement}		options.content			The content container where the scrolling content live in. If leave empty, content of container will be appended to a newly created content node.
	 * @param	{Number}			options.scrollDistance	Controls the distance scrolled per unit of mouse scroll.
	 * @param	{Number}			options.distanceDecay	Controls the rate with which the target position is approached after scrolling.
	 * @param	{Number}			options.clampExtension	This limits how far out of clamping bounds we allow the target position to be at most.
	 * @param	{Boolean}			options.horizontal		Scroll horizontally or vertically.
	 * @param	{Boolean}			options.overrideScroll	Override vanilla scrolling behaviour.
	 * @param	{Boolean}			options.smooth			Enable smooth scrolling.
	 * @param	{Boolean}			options.scrollbar		Inject custom scrollbar.
	 * @param	{Boolean}			options.scrollout		Bubble scrolling event to parent when child max scroll is achieved.
	 * @param	{Number}			options.barSize			Scroll bar size.
	 */
	constructor(container, {
		content,
		scrollDistance = 80,
		distanceDecay = 0.01,
		clampExtension = 500,
		horizontal = false,
		overrideScroll = true,
		smooth = true,
		scrollbar = true,
		scrollout = true,
		barSize = 10,
		debug = false
	} = {}) {
		if (typeof container !== "object" || (!container.classList && !container.container))
			throw { code: -1, description: `Scrollable(): container is not a valid node` }

		if (content) {
			/**
			 * Main scrolling container
			 *
			 * @type {HTMLElement}
			 */
			this.container = container;

			/**
			 * Scrolling content wrapper
			 *
			 * @type {HTMLElement}
			 */
			this.content;

			switch (typeof content) {
				case "object":
					this.content = content;
					break;

				default:
					this.content = document.createElement("div");
					this.content.innerHTML = content;
					break;
			}

			if (!this.container.contains(this.content))
				this.container.appendChild(this.content);

		} else {
			this.container = document.createElement("div");
			this.container.id = container.id;
			container.parentElement.replaceChild(this.container, container);

			this.content = container;
			this.content.removeAttribute("id");
			this.container.appendChild(this.content);
		}

		this.container.classList.add("scrollable");
		this.content.classList.add("content");
		this.content.clampValue = 0;

		/**
		 * Vertical Scrollbar
		 *
		 * @type {HTMLElement}
		 */
		this.vBar = makeTree("div", ["scrollbar", "vertical"], {
			thumb: { tag: "div", class: "thumb" }
		});

		/**
		 * Horizontal Scrollbar
		 *
		 * @type {HTMLElement}
		 */
		this.hBar = makeTree("div", ["scrollbar", "horizontal"], {
			thumb: { tag: "div", class: "thumb" }
		});

		this.container.insertBefore(this.hBar, this.container.firstChild);
		this.container.insertBefore(this.vBar, this.container.firstChild);

		// Add debug graphs to scroll container if debugging is enabled.
		// This is temporary and might be removed in the future.
		if (debug) {
			this.debug = document.createElement("div");
			this.debug.classList.add("debug-graph");
			this.debug2 = document.createElement("div");
			this.debug2.classList.add("debug-graph", "d2");

			this.debugBarSize = 3;
			this.container.append(this.debug, this.debug2);
		}

		/**
		 * Controls the rate with which the target position is approached
		 * after scrolling. Default is 0.01
		 *
		 * @type {Number}
		 */
		this.distanceDecay = distanceDecay;

		/**
		 * Current scroll distance decay set in the update function.
		 *
		 * @type {Number}
		 */
		this.currentDistanceDecay = distanceDecay;

		/**
		 * This limits how far out of clamping bounds we allow the
		 * target position to be at most.
		 *
		 * Effectively, larger values result in bouncier behavior
		 * as the scroll boundaries are approached with high velocity.
		 *
		 * @type {Number}
		 */
		this.clampExtension = clampExtension;

		/**
		 * Controls the distance scrolled per unit of mouse scroll.
		 *
		 * @type {Number}
		 */
		this.scrollDistance = scrollDistance;

		/**
		 * The maximum distance that can be scrolled in the scroll direction.
		 *
		 * @type {Number}
		 */
		this.scrollableExtent = 0;

		/**
		 * The current scroll position.
		 *
		 * @type {Number}
		 */
		this.current = 0;

		/**
		 * The target scroll position which is exponentially approached
		 * by current via a rate of distance decay.
		 *
		 * When not animating scroll position, this will always
		 * be equal to {@link current}.
		 *
		 * @type {Number}
		 */
		this.target = 0;

		this.clamping = false;
		this.currentClampV = 0;
		this.currentClampH = 0;
		this.vHideTimeout = null;
		this.hHideTimeout = null;
		this.smooth = smooth;
		this.barSize = barSize;
		this.overrideScroll = overrideScroll;
		this.scrollbar = scrollbar;

		/**
		 * Animation frame ID.
		 */
		this.frameID = null;

		/**
		 * Animation running state.
		 */
		this.running = false;

		/**
		 * Last update frame time. This need to be set on every scroll
		 * update.
		 */
		this.lastFrameTime = 0;

		/** @type {Boolean} */
		this.horizontal = horizontal;

		this.dragInit = false;
		this.disabled = false;

		/**
		 * Stop Propagating to parent scrollable even when scroll content
		 * reached top or bottom point of scroll container
		 *
		 * @type {Boolean}
		 */
		this.scrollout = scrollout;

		// Listeners for scrolling events
		this.content.addEventListener("scroll", (e) => this.updateScrollbar(e), { passive: true });
		this.content.addEventListener("wheel", (event) => {
			if (event.ctrlKey || !this.overrideScroll)
				return;

            let delta = -event.wheelDelta;

			if (this.scrollout) {
				const contentScrollable = (this.scrollableExtent > 0)
					&& ((delta > 0 && this.current < this.scrollableExtent) || (delta < 0 && this.current > 0));

				if (contentScrollable)
					event.stopPropagation();
			} else {
				event.stopPropagation();
			}

			event.preventDefault();

			if (this.smooth)
				this.animationUpdate({ event });
			else
				this.update({ event });

		}, { passive: false });

		// Observer for content resizing and new element
		// added into content for updating state and scrollbar.
		new ResizeObserver(() => {
			this.updateState();

			this.updateScrollbarPos();
			this.updateScrollbar();
		}).observe(this.content);

		new MutationObserver(() => this.updateObserveList()).observe(
			this.content,
			{ childList: true }
		);

		// Since we add the mutation observer after the
		// content element is initialized, there are (maybe)
		// elements that hasn't applied observing.
		// So we call this to apply observer into
		// existing elements
		this.updateObserveList();
	}

	/**
	 * This corresponds to the clamping force. A larger value means
	 * more aggressive clamping. Default is 0.012.
	 *
	 * @returns	{Number}
	 */
	get DISTANCE_DECAY_CLAMPING() {
		return 0.012;
	}

	initDrag() {
		if (this.dragInit)
			return;

		// Listeners for dragging and dropping scrollbar thumb
		this.cRel = { x: 0, y: 0 }
		this.sTicking = false;
		this.vThumbDragging = false;
		this.hThumbDragging = false;
		this.__dragStartV = (e) => this.dragStart(e, false);
		this.__dragStartH = (e) => this.dragStart(e, true);
		this.__dragUpdate = (e) => this.dragUpdate(e);
		this.__dragEnd = () => this.dragEnd();
		this.__hoverUpdate = () => this.updateScrollbar();

		this.vBar.thumb.addEventListener("mousedown", this.__dragStartV);
		this.hBar.thumb.addEventListener("mousedown", this.__dragStartH);
		window.addEventListener("mouseup", this.__dragEnd);
		this.container.addEventListener("mouseenter", this.__hoverUpdate);

		this.dragInit = true;
	}

	cleanDrag() {
		if (!this.dragInit)
			return;

		this.vBar.thumb.removeEventListener("mousedown", this.__dragStartV);
		this.hBar.thumb.removeEventListener("mousedown", this.__dragStartH);
		window.removeEventListener("mouseup", this.__dragEnd);
		this.container.removeEventListener("mouseenter", this.__hoverUpdate);

		this.dragInit = false;
	}

	dragStart(e, horizontal = false) {
		e.preventDefault();
		this.vThumbDragging = !horizontal;
		this.hThumbDragging = horizontal;
		window.addEventListener("mousemove", this.__dragUpdate);

		// Calculate cursor position relative to selected track
		let r = e.target.getBoundingClientRect();
		this.cRel.x = e.clientX - r.left;
		this.cRel.y = e.clientY - r.top;
	}

	dragUpdate(e) {
		if (!this.vThumbDragging && !this.hThumbDragging)
			return;

		e.preventDefault();

		if (!this.sTicking) {
			this.sTicking = true;

			requestAnimationFrame(() => {
				let horizontal;
				let value;

				if (this.vThumbDragging) {
					const r = this.vBar.getBoundingClientRect();
					const t = this.vBar.thumb.getBoundingClientRect();
					const top = r.top + this.cRel.y;
					const bottom = (r.top + r.height) - (t.height - this.cRel.y);
					const cVal = clamp((e.clientY - top) / (bottom - top), 0, 1);

					value = this.verticalScrollableExtent * cVal;
					horizontal = false;
				}

				if (this.hThumbDragging) {
					const r = this.hBar.getBoundingClientRect();
					const t = this.hBar.thumb.getBoundingClientRect();
					const left = r.left + this.cRel.x;
					const right = (r.left + r.width) - (t.width - this.cRel.x);
					const cVal = clamp((e.clientX - left) / (right - left), 0, 1);

					value = this.horizontalScrollableExtent * cVal;
					horizontal = true;
				}

				if (typeof horizontal === "boolean") {
					const scrollableExtent = (horizontal)
						? this.horizontalScrollableExtent
						: this.verticalScrollableExtent;

					this.content[horizontal ? "scrollLeft" : "scrollTop"]
						= Math.min(scrollableExtent, value);
				}

				this.sTicking = false;
			});
		}
	}

	dragEnd() {
		this.vThumbDragging = false;
		this.hThumbDragging = false;
		window.removeEventListener("mousemove", this.__dragUpdate);
	}

	updateState() {
		const { width, height } = this.content.getBoundingClientRect();
		this.contentWidth = width;
		this.contentHeight = height;
		this.horizontalScrollableExtent = this.content.scrollWidth - this.contentWidth;
		this.verticalScrollableExtent = this.content.scrollHeight - this.contentHeight;
		this.scrollableExtent = (this.horizontal) ? this.horizontalScrollableExtent : this.verticalScrollableExtent;
	}

	updateObserveList() {
		for (let e of this.content.children) {
			// If current element already being
			// observed, skip to next element
			if (e.getAttribute("observing"))
				continue;

			e.setAttribute("observing", "true");
			new ResizeObserver(async() => {
				// For some weird reason we have to wait for next
				// frame to let content scrolling position update
				// A better implement is appreciated
				await nextFrameAsync();

				this.updateState();
				this.updateScrollbar();
			}).observe(e);
		}
	}

	/**
	 * Enable or Disable custom scrollbar
	 * You probally won't do it. Right? 😊
	 *
	 * @param	{Boolean}	enable
	 */
	set scrollbar(enable) {
		if (typeof enable !== "boolean")
			throw { code: -1, description: `Scrollable.scrollbar: not a valid boolean` }

		this.__scrollbar = enable;

		if (enable) {
			this.container.classList.add("customScrollbar");
			this.initDrag();
		} else {
			this.container.classList.remove("customScrollbar");
			this.cleanDrag();
		}
	}

	/**
	 * Is the custom scrollbar Enabled
	 * or Disabled?
	 *
	 * @returns	{Boolean}
	 */
	get scrollbar() {
		return this.__scrollbar;
	}

	/**
	 * Set scrollbar width/height
	 *
	 * @returns	{Number}
	 */
	set barSize(size) {
		this.__barSize = size;
		this.container.style.setProperty("--scrollbar-size", `${size}px`);
	}

	get barSize() {
		return this.__barSize;
	}

	updateScrollbar() {
		if (!this.scrollbar)
			return;

		/** @type {HTMLElement} */
		const content = this.content;

		const rect =  {
			width: content.offsetWidth,
			height: content.offsetHeight,
			sWidth: content.scrollWidth + Math.abs(this.currentClampH),
			sHeight: content.scrollHeight + Math.abs(this.currentClampV)
		}

		const bar = {
			width: this.hBar.getBoundingClientRect().width,
			height: this.vBar.getBoundingClientRect().height
		}

		const top = content.scrollTop;
		const left = content.scrollLeft;
		const width = rect.sWidth - rect.width - Math.abs(this.currentClampH);
		const height = rect.sHeight - rect.height - Math.abs(this.currentClampV);
		const tWidth = (rect.width / rect.sWidth) * bar.width;
		const tHeight = (rect.height / rect.sHeight) * bar.height;

		if (!this.almostEquals(rect.height, rect.sHeight, 1.001)) {
			clearTimeout(this.vHideTimeout);
			this.vBar.classList.remove("hide", "none");
			this.vBar.thumb.style.height = `${tHeight}px`;
			this.vBar.thumb.style.top = `${(top / height) * (bar.height - tHeight)}px`;
		} else if (!this.clamping) {
			this.vBar.classList.add("hide");
			clearTimeout(this.vHideTimeout);
			this.vHideTimeout = setTimeout(() => this.vBar.classList.add("none"), 1000);
		}

		if (!this.almostEquals(rect.width, rect.sWidth, 1.001)) {
			clearTimeout(this.hHideTimeout);
			this.hBar.classList.remove("hide", "none");
			this.hBar.thumb.style.width = `${tWidth}px`;
			this.hBar.thumb.style.left = `${(left / width) * (bar.width - tWidth)}px`;
		} else if (!this.clamping) {
			this.hBar.classList.add("hide");
			clearTimeout(this.hHideTimeout);
			this.hHideTimeout = setTimeout(() => this.hBar.classList.add("none"), 1000);
		}

		this.content.classList[top > 5 ? "add" : "remove"]("scrolling");
	}

	async toBottom() {
		// Make sure we have time to let browser update the current state
		// of our scrolling container.
		await nextFrameAsync();

		if (this.smooth) {
			this.animationUpdate({
				value: this.scrollableExtent,
				horizontal: false
			});
		} else {
			this.update({
				value: this.scrollableExtent,
				horizontal: false
			});
		}

		return this;
	}

	/**
	 * Clamp a value to the available scroll range.
	 *
	 * @param	{Number}	position	The value to clamp.
	 * @param	{Number}	extension	An extension value beyond the normal extent.
	 */
	clamp(position, extension = 0) {
		return Math.max(Math.min(position, this.scrollableExtent + extension), -extension);
	}

	lerp(start, final, amount) {
		return start + (final - start) * amount;
	}

	almostEquals(value1, value2, acceptableDifference = Number.EPSILON) {
		return Math.abs(value1 - value2) <= acceptableDifference;
	}

	updateScrollbarPos() {
		this.vBar.style.top = `${this.content.offsetTop}px`;
		this.vBar.style.bottom = `${this.container.offsetHeight - this.content.offsetTop - this.content.offsetHeight}px`;
		this.hBar.style.left = `${this.content.offsetLeft}px`;
		this.hBar.style.right = `${this.container.offsetWidth - this.content.offsetLeft - this.content.offsetWidth + this.barSize}px`;
	}

	update({
		event,
		value
	} = {}) {
		// Calculate the point where the user start scrolling
		const from = (this.horizontal)
			? this.content.scrollLeft
			: this.content.scrollTop;

		// Amount of scroll in pixel
		const delta = (event)
			? -event.wheelDelta
			: value - from;

		// Check if scrolling event actually move the
		// scrollable content or scrolling is disabled
		// If so we will stop executing
		if (delta === 0 || this.disabled)
			return;

		this.content[this.horizontal ? "scrollLeft" : "scrollTop"] = Math.min(this.scrollableExtent, from + delta);
	}

	animationUpdate({
		event,
		value
	} = {}) {
		// Calculate the point where the user start scrolling
		const from = (this.horizontal)
			? this.content.scrollLeft
			: this.content.scrollTop;

		/**
		 * Wheel on a mouse always produce a delta value of 120, so this simple check
		 * will work fine (hopefully).
		 *
		 * Source: https://devblogs.microsoft.com/oldnewthing/20130123-00/?p=5473
		 */
		const isPrecise = (event)
			? ((Math.abs(event.wheelDelta) % 60) !== 0)
			: false;

		// Amount of scroll in pixel
		const delta = (event)
			? -((isPrecise) ? (this.horizontal ? event.wheelDeltaX : event.wheelDeltaY) : event.wheelDelta)
			: value - from;

		// Let trackpad also scroll in other direction, but without us handing
		// the scrolling.
		if (isPrecise && event) {
			if (this.horizontal && event.wheelDeltaY !== 0) {
				// Allow trackpad to also scroll vertically.
				this.content.scrollTop = clamp(
					this.content.scrollTop - event.wheelDeltaY,
					0,
					this.verticalScrollableExtent
				);
			} else if (!this.horizontal && event.wheelDeltaX !== 0) {
				// Allow trackpad to also scroll horizontally.
				this.content.scrollLeft = clamp(
					this.content.scrollLeft - event.wheelDeltaX,
					0,
					this.horizontalScrollableExtent
				);
			}
		}

		// Check if scrolling event actually move the
		// scrollable content or scrolling is disabled
		// If so we will stop executing
		if (delta === 0 || this.disabled)
			return;

		if (!value) {
			value = (isPrecise)
				? this.target + delta
				: this.target + (this.scrollDistance * (delta / 120));
		}

		this.currentDistanceDecay = (isPrecise) ? 0.05 : this.distanceDecay;
		this.target = this.clamp(value, this.clampExtension);
		this.isUpdateFrame = true;
		this.animationStartUpdate();
	}

	async animationStartUpdate() {
		if (this.running)
			return;

		this.running = true;
		cancelAnimationFrame(this.frameID);

		// Kind of weird that we need to wait another frame to make elapsed time
		// calculation work properly in the first call.
		this.lastFrameTime = performance.now();
		await nextFrameAsync();

		this.frameID = requestAnimationFrame(() => this.animationUpdatePosition());
	}

	/**
	 * Update scrolling position. This function should be called per-frame.
	 *
	 * This is a almost 1-to-1 implementation of osu-framework's ScrollContainer.
	 *
	 * Source:
	 * https://github.com/ppy/osu-framework/blob/master/osu.Framework/Graphics/Containers/ScrollContainer.cs
	 */
	animationUpdatePosition() {
		this.running = true;
		const currentTime = performance.now();

		/** Elapsed time during last frame in milliseconds. */
		const elapsed = currentTime - this.lastFrameTime;

		this.lastFrameTime = currentTime;
		let localDistanceDecay = this.currentDistanceDecay;

		// If we have scrolled out of bounds, then we should handle the clamping force.
		// Note, that if the target is _within_ acceptable bounds, then we do not need
		// special handling of the clamping force, as we will naturally scroll back
		// into acceptable bounds.
		if (this.current !== this.clamp(this.current) && this.target !== this.clamp(this.target, -0.01)) {
			// Firstly, we want to limit how far out the target may go to limit overly bouncy
            // behaviour with extreme scroll velocities.
			this.target = this.clamp(this.target, this.clampExtension);

			// Secondly, we would like to quickly approach the target while we are out of bounds.
            // This is simulating a "strong" clamping force towards the target.
			if ((this.current < this.target && this.target < 0) || (this.current > this.target && this.target > this.scrollableExtent))
				localDistanceDecay = this.DISTANCE_DECAY_CLAMPING * 2;

			// Lastly, we gradually nudge the target towards valid bounds.
			this.target = this.lerp(this.clamp(this.target), this.target, Math.exp(-(this.DISTANCE_DECAY_CLAMPING * elapsed)));

			let clampedTarget = this.clamp(this.target);
			if (this.almostEquals(clampedTarget, this.target))
				this.target = clampedTarget;

			this.clamping = true;
		} else {
			// We are currently in bound of scrollable content.
			this.clamping = false;
		}

		// Exponential interpolation between the target and our current scroll position.
		this.current = this.lerp(this.target, this.current, Math.exp(-(localDistanceDecay * elapsed)));

		// This prevents us from entering the de-normalized range of floating point
		// numbers when approaching target closely.
		if (this.almostEquals(this.current, this.target, 0.00001)) {
			this.current = this.target;
			this.running = false;
			this.clamping = false;
		}

		const fineDelta = round(Math.abs(this.current - this.target), 6);

		if (this.debug) {
			let col = document.createElement("span");
			col.style.width = `${this.debugBarSize}px`;
			col.style.height = `${this.debugBarSize + fineDelta}px`;

			if (this.clamping)
				col.classList.add("red");
			if (this.isUpdateFrame)
				col.classList.add("green");

			this.debug.appendChild(col);

			// Remove exceeding debug bars.
			const maxBars = Math.floor(this.contentWidth / this.debugBarSize);
			while (this.debug.childElementCount > maxBars)
				this.debug.removeChild(this.debug.firstChild);
		}

		if (this.debug2) {
			let col = document.createElement("span");
			col.style.width = `${this.debugBarSize}px`;
			col.style.height = `${this.debugBarSize + elapsed}px`;
			col.classList.add("orange");

			this.debug2.appendChild(col);

			// Remove exceeding debug bars.
			const maxBars = Math.floor(this.contentWidth / this.debugBarSize);
			while (this.debug2.childElementCount > maxBars)
				this.debug2.removeChild(this.debug2.firstChild);
		}

		this.isUpdateFrame = false;

		// Finally update the scroll position in DOM.
		const scrollValue = clamp(this.current, 0, this.scrollableExtent);
		this.content[this.horizontal ? "scrollLeft" : "scrollTop"] = scrollValue;

		if (this.clamping) {
			// We are now clamping outside of content. Transform out-of-bound
			// value to CSS `translate()` value because browser do not support
			// out of bound scrollTop.

			const clampValue = -((this.current < 0)
				? this.current
				: (this.current - this.scrollableExtent));

			this.content.style.transform = (this.horizontal)
				? `translateX(${round(clampValue, 5)}px)`
				: `translateY(${round(clampValue, 5)}px)`;

			if (this.horizontal)
				this.currentClampH = clampValue;
			else
				this.currentClampV = clampValue;

			this.content.clampValue = clampValue;

			this.updateScrollbar();
		} else {
			// Scrolling inside content. Just set the scrollTop value normally.
			this.content.style.transform = null;
			this.content.clampValue = 0;
		}

		if (this.running)
			this.frameID = requestAnimationFrame(() => this.animationUpdatePosition());
	}

	scrollTo(top = 0, {
		duration = 0.6,
		timing = Easing.OutQuart
	} = {}) {
		return new Promise((resolve) => {
			let begin = this.content.scrollTop;

			new Animator(duration, timing, (t) => {
				let c = begin + (top - begin) * t;
				this.content.scrollTop = c;
			}).onComplete(() => resolve());
		});
	}

	get scrollTop() {
		return this.content.scrollTop;
	}
}
