import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { interests } from '@/data/mockData';

interface InterestSelectorProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
}

const InterestSelector = ({ selectedInterests, onInterestsChange }: InterestSelectorProps) => {
  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      onInterestsChange(selectedInterests.filter(id => id !== interestId));
    } else {
      onInterestsChange([...selectedInterests, interestId]);
    }
  };

  return (
    <section id="interests" className="py-12 md:py-16 bg-secondary/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            What are you interested in?
          </h2>
          <p className="text-muted-foreground">
            Select your interests to personalize your event feed
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {interests.map((interest, index) => (
            <Button
              key={interest.id}
              variant={selectedInterests.includes(interest.id) ? 'tagActive' : 'tag'}
              size="tag"
              onClick={() => toggleInterest(interest.id)}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="mr-1">{interest.icon}</span>
              {interest.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InterestSelector;
