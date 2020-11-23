import {Component, Inject, Input, OnInit} from '@angular/core';
import {EventInterface} from '@sports-alliance/sports-lib/lib/events/event.interface';
import {AppEventService} from '../../services/app.event.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import * as Sentry from '@sentry/browser';
import {ActivityInterface} from '@sports-alliance/sports-lib/lib/activities/activity.interface';
import {User} from '@sports-alliance/sports-lib/lib/users/user';

import {DataDistance} from '@sports-alliance/sports-lib/lib/data/data.distance';
import {DataDeviceNames} from '@sports-alliance/sports-lib/lib/data/data.device-names';
import {DataAscent} from '@sports-alliance/sports-lib/lib/data/data.ascent';
import {DataDescent} from '@sports-alliance/sports-lib/lib/data/data.descent';
import {ActivityTypes, ActivityTypesHelper} from '@sports-alliance/sports-lib/lib/activities/activity.types';
import {DataActivityTypes} from '@sports-alliance/sports-lib/lib/data/data.activity-types';
import { DataEnergy } from '@sports-alliance/sports-lib/lib/data/data.energy';


@Component({
  selector: 'app-activity-form',
  templateUrl: './activity.form.component.html',
  styleUrls: ['./activity.form.component.css'],
  providers: [],
})


export class ActivityFormComponent implements OnInit {


  public activity: ActivityInterface;
  public event: EventInterface;
  public user: User;
  public activityTypesArray = ActivityTypesHelper.getActivityTypesAsUniqueArray();

  public activityFormGroup: FormGroup;

  public isLoading: boolean;

  constructor(
    public dialogRef: MatDialogRef<ActivityFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private eventService: AppEventService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) {
    this.activity = data.activity;
    this.event = data.event;
    this.user = data.user;
  }

  async ngOnInit() {
    if (!this.user || !this.event) {
      throw new Error('Component needs event and user')
    }
    // Now build the controls
    this.activityFormGroup = new FormGroup({
        activity: new FormControl(this.activity),
        creatorName: new FormControl(this.activity.creator.name, [
          Validators.required,
        ]),
        startDate: new FormControl(this.activity.startDate, [
          Validators.required,
        ]),
        endDate: new FormControl({value: this.activity.endDate, disabled: true}, [
          Validators.required,
        ]),
        startTime: new FormControl(this.getTimeFromDateAsString(this.activity.startDate), [
          Validators.required,
        ]),
        endTime: new FormControl({
          value: this.getTimeFromDateAsString(this.activity.endDate),
          disabled: true
        }, [
          Validators.required,
        ]),
        type: new FormControl(this.activity.type, [
          Validators.required,
        ]),
      }
    );

    const ascent = this.activity.getStat(DataAscent.type);
    this.activityFormGroup.addControl('ascent', new FormControl(ascent ? ascent.getValue() : 0, [
      Validators.required,
    ]));

    const descent = this.activity.getStat(DataDescent.type);
    this.activityFormGroup.addControl('descent', new FormControl(descent ? descent.getValue() : 0, [
      Validators.required,
    ]));

    const distance = this.activity.getStat(DataDistance.type);
    this.activityFormGroup.addControl('distance', new FormControl(distance ? distance.getValue() : 0, [
      Validators.required,
    ]));

    const energy = this.activity.getStat(DataEnergy.type);
    this.activityFormGroup.addControl('energy', new FormControl(energy ? energy.getValue() : 0, [
      Validators.required,
    ]));

    // Set this to done loading
    this.isLoading = false;
  }

  onStartDateAndStartTimeChange(event) {
    const starDate = this.activityFormGroup.get('startDate').value;
    if (!starDate) {
      return;
    }
    starDate.setHours(this.activityFormGroup.get('startTime').value.split(':')[0]);
    starDate.setMinutes(this.activityFormGroup.get('startTime').value.split(':')[1]);
    starDate.setSeconds(this.activityFormGroup.get('startTime').value.split(':')[2]);
    const endDate = new Date(starDate.getTime() + this.activity.getDuration().getValue() * 1000 + this.activity.getPause().getValue() * 1000);
    this.activityFormGroup.get('endDate').setValue(endDate);
    this.activityFormGroup.get('endTime').setValue(this.getTimeFromDateAsString(endDate))
  }

  hasError(field?: string) {
    if (!field) {
      return !this.activityFormGroup.valid;
    }
    return !(this.activityFormGroup.get(field).valid && this.activityFormGroup.get(field).touched);
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.activityFormGroup.valid) {
      this.validateAllFormFields(this.activityFormGroup);
      return;
    }
    this.isLoading = true;

    try {
      // this saves 2 entities
      if (this.activityFormGroup.get('creatorName').dirty) {
        this.activity.creator.name = this.activityFormGroup.get('creatorName').value;
        this.event.addStat(new DataDeviceNames(this.event.getActivities().map(eventActivities => eventActivities.creator.name)));
      }
      if (this.activityFormGroup.get('startDate') && (this.activityFormGroup.get('startDate').dirty || this.activityFormGroup.get('startTime').dirty)) {
        this.activity.startDate = this.activityFormGroup.get('startDate').value;
        this.activity.startDate.setHours(this.activityFormGroup.get('startTime').value.split(':')[0]);
        this.activity.startDate.setMinutes(this.activityFormGroup.get('startTime').value.split(':')[1]);
        this.activity.startDate.setSeconds(this.activityFormGroup.get('startTime').value.split(':')[2]);
        this.activity.startDate.setMilliseconds(0);
        this.activity.endDate = new Date(this.activity.startDate.getTime() + this.activity.getDuration().getValue() * 1000 + this.activity.getPause().getValue() * 1000);
        if (this.activity === this.event.getFirstActivity()) {
          this.event.startDate = this.activity.startDate;
        }
        if (this.activity === this.event.getLastActivity()) {
          this.event.endDate = this.activity.endDate;
        }
      }

      if (this.activityFormGroup.get('ascent').dirty) {
        this.activity.addStat(new DataAscent(this.activityFormGroup.get('ascent').value));
        this.event.addStat(new DataAscent(this.event.getActivities().reduce((ascent, activity) => {
          const activityAscent = activity.getStat(DataAscent.type);
          if (activityAscent) {
            ascent += <number>activityAscent.getValue();
          }
          return ascent;
        }, 0)));
      }

      if (this.activityFormGroup.get('descent').dirty) {
        this.activity.addStat(new DataDescent(this.activityFormGroup.get('descent').value));
        this.event.addStat(new DataDescent(this.event.getActivities().reduce((descent, activity) => {
          const activityDescent = activity.getStat(DataDescent.type);
          if (activityDescent) {
            descent += <number>activityDescent.getValue();
          }
          return descent;
        }, 0)));
      }

      if (this.activityFormGroup.get('energy').dirty) {
        this.activity.addStat(new DataEnergy(this.activityFormGroup.get('energy').value));
        this.event.addStat(new DataEnergy(this.event.getActivities().reduce((energy, activity) => {
          const activityEnergy = activity.getStat(DataEnergy.type);
          if (activityEnergy) {
            energy += <number>activityEnergy.getValue();
          }
          return energy;
        }, 0)));
      }

      if (this.activityFormGroup.get('distance').dirty) {
        this.activity.addStat(new DataDistance(this.activityFormGroup.get('distance').value));
        // This regenerates the event distance and its ugly as it doesnt save it
        this.event.addStat(new DataDistance(this.event.getActivities().reduce((distance, activity) => {
          const activityDistance = activity.getStat(DataDistance.type);
          if (activityDistance) {
            distance += <number>activityDistance.getValue();
          }
          return distance;
        }, 0)));
      }

      if (this.activityFormGroup.get('type').dirty) {
        this.activity.type = ActivityTypes[<keyof typeof ActivityTypes>this.activityFormGroup.get('type').value];
        this.event.addStat(new DataActivityTypes(this.event.getActivities().map(activity => activity.type)));
      }

      await this.eventService.setActivity(this.user, this.event, this.activity);
      await this.eventService.setEvent(this.user, this.event);

      this.snackBar.open('Activity saved', null, {
        duration: 2000,
      });
    } catch (e) {
      // debugger;
      Sentry.captureException(e);

      this.snackBar.open('Could not save activity', null, {
        duration: 2000,
      });
      Sentry.captureException(e);
    } finally {
      this.isLoading = false;
      this.dialogRef.close();
    }
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({onlySelf: true});
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }

  close(event) {
    event.stopPropagation();
    event.preventDefault();
    this.dialogRef.close();
  }

  private getTimeFromDateAsString(date: Date): string {
    return `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}:${('0' + date.getSeconds()).slice(-2)}`
  }
}



export const autocompleteSelectionValidator: ValidatorFn = (control: FormControl): ValidationErrors | null => {
  const selection: any = control.value;
  if (typeof selection === 'string') {
    return {requireMatch: true};
  }
  return null;
}
