var selectParentBlockFor = function (component) {
    return 'Please select parent block of ' + component;
};
var existingBlocks = require('./current-structure');
var path = require('path');
var filter = require('./filter-name.js');
var validate = require('./validate-name.js');

var inquirer = require('inquirer');
var _ = require('underscore.string');

var prompting = {
    defineCreatedComponent: defineCreaedComponent,
    describeCreatedBlock: describeCreatedBlock,
    describeCreatedElement: describeCreatedElement,
    describeCreatedModifier: describeCreatedModifier
};

function getBlocks(currentStructure, useCollections) {
    var choicesArray = [];

    currentStructure.blocks.forEach(function(block) {
        choicesArray.push({
            name: block.name,
            value: {
                blockName: block.name,
                collectionName: ''
            }
        });
    });

    if (useCollections) {
        currentStructure.collections.forEach(function(collection) {
            collection.blocks.forEach(function(block) {
                choicesArray.push({
                    name: block.name + ' @ ' + collection.name,
                    value: {
                        blockName: block.name,
                        collectionName: collection.name
                    }
                });
            });
        });
    }

    return choicesArray;
}

function askName(convention, type, separator) {
    return {
        type: 'input',
        name: 'creatingComponentName',
        message: 'Please define name:',
        filter: function (input) {
            return filter(convention, input, type, separator);
        },
        validate: function (input, answers) {

            return validate(convention, input, type, separator);
        }
    }
}

function defineCreaedComponent(generatorConfig) {

    return [
        {
            type: 'list',
            name: 'creatingComponentType',
            message: 'What would you like to crate?',
            choices: [
                {
                    name: 'block',
                    value: 'block'
                },
                {
                    name: generatorConfig.prefixForElement + 'element',
                    value: 'element'
                },
                {
                    name: generatorConfig.prefixForModifier + 'modifier',
                    value: 'modifier'
                }
            ]
        }
    ];
}

function describeCreatedBlock(generatorConfig, currentStructure, previousAnswers) {

    return [
        askName(generatorConfig.namingConvention, previousAnswers.creatingComponentType, generatorConfig.prefixForModifier),
        {
            type: 'list',
            name: 'putBlockInCollection',
            message: 'Should I put this Block in collection?',
            when: function (answers) {
                answers.pathToComponent = '';
                answers.exportTo = path.join(generatorConfig.bemDirectoryPath, generatorConfig.rootStylesFile);
                return generatorConfig.useCollections;
            },
            choices: [
                {
                    name: 'No',
                    value: false
                },
                {
                    name: 'Yes',
                    value: true
                }
            ]
        },
        {
            type: 'list',
            name: 'parentCollectionOfBlock',
            message: 'Please choose Collection for block:',
            when: function(answers) {

                if (answers.putBlockInCollection === false) {
                    answers.parentCollectionOfBlock = '';
                }

                return answers.putBlockInCollection;


            },
            choices: function () {
                var choicesArray = [];

                currentStructure.collections.forEach(function (collection) {
                    choicesArray.push({
                        name: collection.name,
                        value: collection.name
                    });
                });

                choicesArray.push(
                    new inquirer.Separator(),
                    {
                        name: 'Create new collection',
                        value: false
                    }
                );

                return choicesArray;
            }
        },
        {
            type: 'input',
            name: 'newParentCollectionOfBlock',
            when: function (answers) {

                if (answers.parentCollectionOfBlock !== false) {
                    answers.pathToComponent = answers.parentCollectionOfBlock;
                }

                return answers.parentCollectionOfBlock === false;
            },
            message: 'Please define collection\'s name, suffix ' + generatorConfig.collectionSuffix + ' will be added automatically',
            filter: function (input) {
                input = input.replace(new RegExp(generatorConfig.collectionSuffix + '$', 'i'), '');
                input = _.ltrim(input);
                input = _.rtrim(input, '-_');

                return input;
            },
            validate: function (input, answers) {

                if (!/^[_a-zA-Z0-9-]+$/.test(input)) {
                    return 'Allowed characters: 0-9, A-Z, dash and underscore';
                } else {
                    answers.parentCollectionOfBlock = input + generatorConfig.collectionSuffix;
                    answers.pathToComponent = answers.parentCollectionOfBlock;
                    return true;
                }
            }
        }
    ];
}

function describeCreatedElement(generatorConfig, currentStructure, previousAnswers) {

    return [
        askName(generatorConfig.namingConvention, previousAnswers.creatingComponentType, generatorConfig.prefixForModifier),
        {
            type: 'list',
            name: 'parentBlockOfElement',
            message: selectParentBlockFor(generatorConfig.prefixForElement + 'element'),
            choices: getBlocks(currentStructure, generatorConfig.useCollections)
        }
    ];
}

function describeCreatedModifier(generatorConfig, currentStructure, previousAnswers) {

    return [
        askName(generatorConfig.namingConvention, previousAnswers.creatingComponentType, generatorConfig.prefixForModifier),
        {
            type: 'list',
            name: 'modifierFor',
            message: 'What is this ' + generatorConfig.prefixForModifier + 'modifier for?',
            choices: [
                {
                    name: 'for block',
                    value: 'forBlock'
                },
                {
                    name: 'for ' + generatorConfig.prefixForElement + 'element',
                    value: 'forElement'
                }
            ]
        },
        {
            type: 'list',
            name: 'parentBlockOfModifier',
            message: function (answer) {
                var str = answer.modifierFor === 'forElement' ? ' that contains ' + generatorConfig.prefixForElement + 'element' : '';

                return 'Please define block' + str;
            },
            choices: getBlocks(currentStructure, generatorConfig.useCollections)
        },
        {
            type: 'list',
            name: 'parentElementOfModifier',
            message: 'Please define parent ' + generatorConfig.prefixForElement + 'element of ' + generatorConfig.prefixForModifier + 'modifier',
            when: function(answers) {
				answers.parentElementOfModifier = '';
                return answers.modifierFor === 'forElement';
            },
            choices: function(answers) {

                var blocksArray,
                    blockPoint,
                    collectionPoint,
                    choicesArray = [];

                if (answers.parentBlockOfModifier.collectionName === '')  {
                    blocksArray = currentStructure.blocks;
                } else {
                    collectionPoint = currentStructure.collections.filter(function (collection) {
                        return collection.name === answers.parentBlockOfModifier.collectionName;
                    });
                    blocksArray = collectionPoint[0].blocks;
                }

                blockPoint = blocksArray.filter(function(block) {
                    return block.name === answers.parentBlockOfModifier.blockName;
                });

                blockPoint[0].elements.forEach(function (element) {
                    choicesArray.push({
                        name: element.name,
                        value: element.name
                    });
                });

                return choicesArray;
            }
        }
    ]
}

module.exports = prompting;