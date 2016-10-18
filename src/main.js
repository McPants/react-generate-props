const _ = require('lodash')
const sinon = require('sinon')
const React = require('react')
const { PropTypes } = React

// TODO: Options API
const options = {
  required: true
}

const wrapPropTypes = () => {
  // Adds a .type key which allows the type to be derived during the
  // evaluation process. This is necessary for complex types which
  // return the result of a generator function, leaving no way to
  // determine which type instantiated it.

  const original = _.cloneDeep(PropTypes)

  _.each(PropTypes, (v, k) => {
    if (v.isRequired !== undefined) {
      // Simple type. Just extend the object
      _.defaultsDeep(PropTypes[k], { type: k, isRequired: { type: k } })
    } else {
      // Complex type. Must extend the creator's return value
      PropTypes[k] = (arg) =>
        _.defaultsDeep(original[k](arg), {
          type: k, arg: arg,
          isRequired: { type: k, arg: arg }
        })
    }
  })
}

wrapPropTypes()

const GENERATORS = {
  // Simple types
  array: () => [],
  bool: () => true,
  func: () => sinon.spy(),
  number: () => 1,
  object: () => ({}),
  string: () => 'A String',
  any: () => 'Any',
  element: () => React.createElement('div'),
  node: () => [React.createElement('div'), React.createElement('div')],

  // Complex types
  arrayOf: (type) => [generateOneProp(type)],
  instanceOf: (klass) => new klass(),
  objectOf: (type) => ({ key: generateOneProp(type) }),
  oneOf: (values) => _.sample(values),
  oneOfType: (types) => generateOneProp(_.extend(_.sample(types), { forceGeneration: true })),
  shape: (shape) => generateProps(shape)
}

const shouldGenerate = (propType) => {
  return (
    propType.forceGeneration ||
    // Generate required props, and this is the required version
    (options.required && !propType.isRequired) ||
    // Generate optional props, and this is the optional version
    (options.optional && !!propType.isRequired)
  )
}

const generateOneProp = (propType, propName) => {
  const generate = GENERATORS[propType.type]
  const arg = propType.arg
  if (generate) {
    if (shouldGenerate(propType)) {
      if (propName) {
        return [propName, generate(arg)]
      } else {
        return generate(arg)
      }
    }
  }
}

const generateProps = (arg) => {
  let propTypes

  if (!arg) {
    throw new TypeError('generateProps expected a propType object or a React Component')
  } else if (_.isPlainObject(arg.propTypes)) {
    propTypes = arg.propTypes
  } else if (_.isPlainObject(arg)) {
    propTypes = arg
  } else {
    throw new TypeError('generateProps expected a propType object or a React Component')
  }

  return _(propTypes)
    .map(generateOneProp)
    .compact()
    .fromPairs()
    .value()
}

module.exports = generateProps
