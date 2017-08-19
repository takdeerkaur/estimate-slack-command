'use strict';

var StoryPoints = function Constructor() {
  this.storyPoints = [{
      emoji: 'zero',
      value: 0
    },
    {
      emoji: 'one',
      value: 1
    },
    {
      emoji: 'two',
      value: 2
    },
    {
      emoji: 'three',
      value: 3
    },
    {
      emoji: 'four',
      value: 4
    },
    {
      emoji: 'five',
      value: 5
    },
    {
      emoji: 'six',
      value: 6
    },
    {
      emoji: 'seven',
      value: 7
    },
    {
      emoji: 'eight',
      value: 8
    },
    {
      emoji: 'nine',
      value: 9
    },
    {
      emoji: 'keycap_ten',
      value: 10
    }
  ]
};

StoryPoints.prototype.isValidStoryPoint = (input) => {
  let validPoint = storyPoints.find(function (point) {
    return point.value === parseInt(input);
  });

  return validPoint;
}

module.exports = StoryPoints;