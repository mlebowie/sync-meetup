import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ONBOARDING_INTERESTS, UserProfile, saveUserProfile } from '@/lib/userProfile';
import { toast } from '@/hooks/use-toast';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
}

const EditProfileDialog = ({ open, onOpenChange, profile, onSaved }: EditProfileDialogProps) => {
  const [location, setLocation] = useState(profile.location);
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth);
  const [interests, setInterests] = useState<string[]>(profile.interests);

  useEffect(() => {
    if (open) {
      setLocation(profile.location);
      setNeighborhood(profile.neighborhood);
      setDateOfBirth(profile.dateOfBirth);
      setInterests(profile.interests);
    }
  }, [open, profile]);

  const toggleInterest = (id: string) => {
    setInterests(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleSave = () => {
    if (!location.trim()) {
      toast({ title: 'Location required', description: 'Please enter your city.', variant: 'destructive' });
      return;
    }
    if (!dateOfBirth) {
      toast({ title: 'Date of birth required', description: 'Please enter your date of birth.', variant: 'destructive' });
      return;
    }
    const updated: UserProfile = {
      ...profile,
      location: location.trim().slice(0, 80),
      neighborhood: neighborhood.trim().slice(0, 80),
      dateOfBirth,
      interests,
    };
    saveUserProfile(updated);
    onSaved(updated);
    toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your location, age, and interests.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-location">City</Label>
              <Input id="edit-location" value={location} onChange={e => setLocation(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-neighborhood">Neighborhood</Label>
              <Input id="edit-neighborhood" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} maxLength={80} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dob">Date of birth</Label>
            <Input
              id="edit-dob"
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_INTERESTS.map(i => {
                const active = interests.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggleInterest(i.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-button'
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                    }`}
                  >
                    <span className="mr-1">{i.icon}</span>
                    {i.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
