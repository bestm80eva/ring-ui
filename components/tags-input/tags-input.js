import React, {Component} from 'react';
import PropTypes from 'prop-types';
import getEventKey from 'react-dom/lib/getEventKey';
import classNames from 'classnames';

import RingComponentWithShortcuts from '../ring-component/ring-component_with-shortcuts';
import Select from '../select/select';
import TagsList from '../tags-list/tags-list';
import Caret from '../caret/caret';
import '../input-size/input-size.scss';
import memoize from '../global/memoize';

import './tags-input.scss';

function noop() {}

/**
 * @name Tags Input
 * @category Forms
 * @constructor
 * @description Displays a tags input field.
 * @extends {ReactComponent}
 * @example-file ./tags-input.examples.html
 */

export default class TagsInput extends RingComponentWithShortcuts {
  static propTypes = {
    tags: PropTypes.array,
    /**
     * Datasource should return array(or promise) of suggestions.
     * Each suggestion should contain key and label fields.
     * DataSource should handle caching and response racing (when later request
     * responded earlier) by himself.
     */
    dataSource: PropTypes.func,
    onAddTag: PropTypes.func,
    onRemoveTag: PropTypes.func,
    customTagComponent: (props, propName, componentName) => {
      if (props[propName] && !props[propName].prototype instanceof Component) {
        return new Error(`Invalid prop ${propName} supplied to ${componentName}. Validation failed.`);
      }
      return null;
    },
    maxPopupHeight: PropTypes.number,
    placeholder: PropTypes.string,
    canNotBeEmpty: PropTypes.bool,
    modalShortcuts: PropTypes.bool,
    disabled: PropTypes.bool,
    autoOpen: PropTypes.bool,
    renderOptimization: PropTypes.bool
  };

  static defaultProps = {
    dataSource: noop,
    onAddTag: noop,
    onRemoveTag: noop,
    customTagComponent: null,
    maxPopupHeight: 500,
    canNotBeEmpty: false,
    modalShortcuts: false,
    disabled: false,
    autoOpen: false,
    renderOptimization: false
  };

  state = {
    tags: [],
    suggestions: [],
    shortcuts: false,
    loading: true,
    activeIndex: 0
  };

  static ngModelStateField = 'tags';
  ngModelStateField = TagsInput.ngModelStateField;

  getShortcutsProps() {
    return {
      map: {
        backspace: (...args) => this.handleKeyDown(...args),
        left: this.selectTag,
        right: () => this.selectTag(true)
      },
      scope: () => this.constructor.getUID('ring-tags-input-'),
      options: {
        modal: this.props.modalShortcuts
      }
    };
  }

  getInputNode() {
    if (!this.input) {
      this.input = this.select.filter.node;
      this.caret = new Caret(this.input);
    }
    return this.input;
  }

  setActiveIndex(activeIndex) {
    this.setState({activeIndex});
  }

  updateStateFromProps(props) {
    if (props.tags) {
      this.setState({tags: props.tags});
      this.setActiveIndex(props.tags.length);
    }
  }

  focusInput = () => {
    this.getInputNode().focus();
  }

  addTag = tag => {
    const tags = this.state.tags.concat([tag]);
    this.setState({tags});
    this.select.clear();
    this.select.filterValue('');
    this.props.onAddTag({tag});
    this.setActiveIndex();
  }

  onRemoveTag(tagToRemove) {
    return Promise.resolve(this.props.onRemoveTag({tag: tagToRemove})).
      then(() => {
        const tags = this.state.tags.filter(tag => tag !== tagToRemove);
        if (this.node) {
          this.setState({tags});
          this.focusInput();
        }
        return tags;
      }, this.focusInput);
  }

  clickHandler = event => {
    if (!event.target.matches(this.getInputNode().tagName)) {
      return;
    }

    this.loadSuggestions(this.getInputNode().value);
    this.focusInput();
  }

  filterExistingTags = suggestions => {
    const tagsMap = new Map(this.state.tags.map(tag => [tag.key, tag]));
    return suggestions.filter(suggestion => !tagsMap.has(suggestion.key));
  }

  loadSuggestions = query => {
    this.setState({loading: true});
    return Promise.resolve(this.props.dataSource({query})).
      then(this.filterExistingTags).
      then(suggestions => {
        if (this.node) {
          this.setState({suggestions, loading: false});
        }
      }).
      catch(() => this.node && this.setState({loading: false}));
  }

  willMount() {
    this.updateStateFromProps(this.props);
  }

  didMount() {
    if (this.props.autoOpen && !this.props.disabled) {
      this.focusInput();
      this.loadSuggestions();
      this.select._showPopup();
    }
  }

  willReceiveProps(props) {
    this.updateStateFromProps(props);
  }

  _focusHandler = () => {
    this.setState({
      shortcuts: true
    });
    this.setActiveIndex(null);
  }

  _blurHandler = () => {
    this.setState({
      shortcuts: false
    });
  }

  selectTag = moveForward => {
    const activeIndex = typeof this.state.activeIndex === 'number'
      ? this.state.activeIndex
      : this.state.tags.length + 1;
    let newActiveIndex = activeIndex + (moveForward ? 1 : -1);

    if (newActiveIndex >= this.state.tags.length) {
      newActiveIndex = this.state.tags.length - 1;
    } else if (newActiveIndex < 0) {
      newActiveIndex = 0;
    }

    if (this.state.activeIndex !== newActiveIndex) {
      this.setActiveIndex(newActiveIndex);
    }
  }

  handleKeyDown = event => {
    if (this.select._popup.isVisible()) {
      return true;
    }

    const key = getEventKey(event);
    const isInputFocused = () => event.target.matches(this.getInputNode().tagName);

    if (key === 'ArrowLeft') {
      if (this.getInputNode() && this.caret.getPosition() > 0) {
        return true;
      }

      this.selectTag();
      return false;
    }

    if (key === 'ArrowRight' && !isInputFocused(event)) {
      if (this.state.activeIndex === this.state.tags.length - 1) {
        if (!this.props.disabled) {
          this.getInputNode().focus();
          this.setActiveIndex();
        }
      } else {
        this.selectTag(true);
      }
      return false;
    }

    if (!this.props.disabled) {
      if (key === 'Backspace' && !this.getInputNode().value) {
        event.preventDefault();
        const tagsLength = this.state.tags.length;
        this.select._hidePopup(true); // otherwise confirmation may be overlapped by popup
        this.onRemoveTag(this.state.tags[tagsLength - 1]);
        return false;
      }

      if ((key === 'Delete' || key === 'Backspace') && this.state.tags[this.state.activeIndex]) {
        this.onRemoveTag(this.state.tags[this.state.activeIndex]).
          then(() => this.selectTag(true));
        return false;
      }
    }

    return true;
  }

  handleClick = memoize(tag => () => {
    this.setActiveIndex(this.state.tags.indexOf(tag));
  });

  handleRemove = memoize(tag => () => this.onRemoveTag(tag));

  selectRef = el => {
    this.select = el;
  };

  render() {
    const classes = classNames(
      'ring-js-shortcuts',
      'ring-tags-input',
      {
        'ring-tags-input_disabled': this.props.disabled
      },
      this.props.className);

    return (
      <div
        className={classes}
        onKeyDown={this.handleKeyDown}
        onClick={this.clickHandler}
      >

        <TagsList
          tags={this.state.tags}
          activeIndex={this.state.activeIndex}
          disabled={this.props.disabled}
          canNotBeEmpty={this.props.canNotBeEmpty}
          handleRemove={this.handleRemove}
          handleClick={this.handleClick}
        />

        <Select
          ref={this.selectRef}
          type={Select.Type.INPUT}
          label={this.props.placeholder}
          data={this.state.suggestions}
          className="ring-input-size_md"
          onSelect={this.addTag}
          onFocus={this._focusHandler}
          onBlur={this._blurHandler}
          renderOptimization={this.props.renderOptimization}
          filter={{
            fn: () => true
          }}
          maxHeight={this.props.maxPopupHeight}
          loading={this.state.loading}
          onFilter={this.loadSuggestions}
          onBeforeOpen={this.loadSuggestions}
          onKeyDown={this.handleKeyDown}
          disabled={this.props.disabled}
        />
      </div>);
  }
}
