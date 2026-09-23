import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, AlertTriangle, Phone, Users, Clock, CheckCircle2 } from "lucide-react";

export function SelfActivationFAQ() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="phone-not-found">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                My phone number isn't found
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Try these steps:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Use the exact phone number from your registration confirmation email</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Make sure to enter exactly 10 digits: 5551234567</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Check if someone else in your group registered with their phone</span>
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Still can't find it? Contact staff - they can help look up your registration by name or email.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="no-rfid">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                I see "Unassigned" - what does this mean?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                "Unassigned" means no credential code is linked to your registration yet.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">What to do:</p>
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-sm">Ask a staff member to assign your wristband to your registration</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-sm">After assignment, return here to finish check-in</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <span className="text-sm">If a waiver is required, it must be signed before that person can check in</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="automatic-checkin">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Who gets checked in when I use this system?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The phone number opens a list of matching people. Eligible people are selected initially, and you can choose who to check in.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Select or clear each eligible person before continuing</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Use <strong>Check-In Everyone</strong> when everyone eligible should be included</span>
                </div>
              </div>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  A person who still needs a waiver or wristband assignment remains blocked, but other eligible people can continue.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meal-plans">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                What do the meal plan badges mean?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Standard Meal Plan
                  </Badge>
                  <span className="text-sm text-muted-foreground">Includes the 6 weekend meals: Friday lunch and dinner, Saturday breakfast, lunch and dinner, Sunday breakfast</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Vegan Meal Plan
                  </Badge>
                  <span className="text-sm text-muted-foreground">Same 6 meals, prepared vegan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No meal plan
                  </Badge>
                  <span className="text-sm text-muted-foreground">Meals were not purchased with your ticket</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Meals purchased in one order are shared across the people on that order, so a companion may hold the plan instead of the buyer.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="activation-failed">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Check-in failed - what should I do?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Try these steps in order:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">1</span>
                  <span>Wait 30 seconds and try again</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">2</span>
                  <span>Check your internet connection</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">3</span>
                  <span>Contact staff if the problem continues</span>
                </div>
              </div>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Staff can manually check you in and troubleshoot any technical issues.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="need-help">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                I need staff assistance
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Staff can help you with:
              </p>
              <div className="space-y-1 text-sm text-muted-foreground ml-4">
                <div>• Finding your registration by name or email</div>
                <div>• Manual check-in if technical issues occur</div>
                <div>• Wristband assignment</div>
                <div>• Registration corrections or updates</div>
              </div>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Have this information ready:</strong> Your full name, phone number, and registration confirmation email if available.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}