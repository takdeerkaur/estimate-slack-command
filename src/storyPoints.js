class StoryPoints {
  constructor() {
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
        emoji: 'five',
        value: 5
      },
      {
        emoji: 'eight',
        value: 8
      },
      {
        emoji: 'bomb',
        value: 13
      }
    ]
  }

  isValidStoryPoint(input) {
    let validPoint = this.storyPoints.find(function (point) {
      return point.value === parseInt(input);
    });

    return validPoint;
  }

}

module.exports = StoryPoints;