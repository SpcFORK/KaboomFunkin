import SML from "./MLtoJSON"

interface Week {

  weekname: string,
  topLeft: string,
  characters: {
    left: string,
    right: string,
  },
  songs: Record<string, string>,

}

interface RawWeekList {

  weeklist: string,
  __text: string,

}

interface WeekList {

  weeklist: string,
  __text: Record<string, string>,

}

// ---

var bm_ = {
  getWeeks: async (weekname) => {
    return await fetch(weekname)
  },

  getStoryWeeks: async () => {
    let weeks = await bm_.getWeeks('weeks/storyweeks.xml')
      .then(res => res.text())
      .then(res => {
        return SML.MLtoJSON(res, 'text/xml') as RawWeekList
      })

    /* 
    <!-- 
      We define a place to fetch all our weeks
      This is how we'll fetch them all from the client.
    -->
    <data weeklist="StoryLine">
      weeks/week1.xml
    </data>
    */

    // The raw xml is broken up into a bunch of text broken by new lines.
    // Let's split it up.
    let split = weeks.__text.split(/(\r\n|\n|\r)/)

    let promiseBucket = await Promise.all(split.map(async (week) => {
      let res_: Week = await bm_.getWeeks(week)
        .then(res => res.text())
        .then(res => {
          return SML.MLtoJSON(res, 'text/xml') as Week
        })

      return res_
    }))

    // Map Array to Object
    let bucket = promiseBucket.reduce((acc, val) => {
      if (!val.weekname) val.weekname = Object.values(val)[0]
      acc[val.weekname] = val
      return acc
    }, {} as Record<string, Week>)

    return bucket
  },
}

export default bm_